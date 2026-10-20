import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PushMessage, PushReceipt, PushSendTicket } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { SystemClockProvider as EnrolmentClockProvider } from '../src/modules/enrolment/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'enrolment-decisions.e2e.example.com';
const MARK = 'e2edecisions';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
// Tomorrow 08:00-09:00 in Fortaleza.
const STARTS_AT = '2026-10-15T11:00:00.000Z';
const ENDS_AT = '2026-10-15T12:00:00.000Z';
// A class of its own days away, so the list can tell two classes apart by start.
const LATER_STARTS_AT = '2026-10-16T11:00:00.000Z';
const LATER_ENDS_AT = '2026-10-16T12:00:00.000Z';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
type EnrolmentStatus = 'pending' | 'approved' | 'denied' | 'withdrawn' | 'expired' | 'cancelled' | 'takenOut' | 'classCancelled';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

/** Records the pushes instead of calling Expo. */
class FakePushProvider {
  sent: PushMessage[] = [];
  failing = false;

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    this.sent.push(...messages);
    if (this.failing) {
      throw new Error('expo unavailable');
    }
    return messages.map(() => ({ status: 'ok', id: `ticket-${randomUUID()}` }));
  }

  async getReceipts(): Promise<Record<string, PushReceipt>> {
    return {};
  }
}

interface Account {
  id: string;
  accessToken: string;
}

describe('Enrolment decisions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let now: Date;
  let locationId: string;
  let locationName: string;
  let classIds: string[];

  beforeEach(async () => {
    push = new FakePushProvider();
    now = NOW;
    classIds = [];
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(ClassesClockProvider)
      .useValue({ now: () => new Date(now.getTime()) })
      .overrideProvider(EnrolmentClockProvider)
      .useValue({ now: () => new Date(now.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
    locationName = `${MARK} ${randomUUID().slice(0, 8)}`;
    locationId = (
      await prisma.location.create({
        data: { id: randomUUID(), name: locationName, nameKey: `${MARK} ${randomUUID()}`, address: 'Av. Beira Mar' },
      })
    ).id;
  });

  afterEach(async () => {
    // Classes go first: their enrolments cascade, and the students are restricted by them. The notifications of
    // our users go with them.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  async function account(role: Role = 'student', status: Status = 'approved', name?: string): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: name ?? `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status,
      },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  async function makeClass(
    creatorId: string,
    overrides: { startsAt?: string; endsAt?: string; capacity?: number; cancelledAt?: Date } = {},
  ) {
    const id = randomUUID();
    classIds.push(id);
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date(overrides.startsAt ?? STARTS_AT),
        endsAt: new Date(overrides.endsAt ?? ENDS_AT),
        locationId,
        capacity: overrides.capacity ?? 8,
        createdBy: creatorId,
        cancelledAt: overrides.cancelledAt ?? null,
      },
    });
    return id;
  }

  async function seedEnrolment(
    classId: string,
    studentId: string,
    status: EnrolmentStatus,
    requestedAt = new Date('2026-10-13T12:00:00.000Z'),
  ) {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: {
        id,
        classId,
        studentId,
        status,
        requestedAt,
        decidedAt: status === 'approved' ? new Date('2026-10-13T13:00:00.000Z') : null,
      },
    });
    return id;
  }

  async function withPhone(userId: string, locale = 'pt-BR') {
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
    });
  }

  const listPending = (token: string | undefined) => as(token, http().get('/enrolments/pending'));
  const approve = (token: string | undefined, id: string) => as(token, http().post(`/enrolments/${id}/approve`));
  const deny = (token: string | undefined, id: string, body?: Record<string, unknown>) =>
    as(token, http().post(`/enrolments/${id}/deny`)).send(body ?? {});

  const enrolmentOf = (id: string) => prisma.enrolment.findUniqueOrThrow({ where: { id } });
  const notificationsOf = (userId: string, type: string) => prisma.notification.findMany({ where: { userId, type } });

  describe('lists pending', () => {
    it('answers the upcoming classes by start with their requests in the order asked', async () => {
      const admin = await account('admin');
      const ana = await account('student', 'approved', 'Ana');
      const bia = await account('student', 'approved', 'Bia');
      const seated = await account('student', 'approved', 'Seated');
      const later = await makeClass(admin.id, { startsAt: LATER_STARTS_AT, endsAt: LATER_ENDS_AT });
      const first = await makeClass(admin.id, { capacity: 2 });
      await seedEnrolment(first, seated.id, 'approved');
      const biaRequest = await seedEnrolment(first, bia.id, 'pending', new Date('2026-10-13T12:05:00.000Z'));
      const anaRequest = await seedEnrolment(first, ana.id, 'pending', new Date('2026-10-13T12:00:00.000Z'));
      await seedEnrolment(later, ana.id, 'pending');

      const response = await listPending(admin.accessToken);

      expect(response.status).toBe(200);
      // Other suites may leave requests of their own in the database: keep ours.
      const ours = (response.body.classes as { id: string }[]).filter((item) => classIds.includes(item.id));
      expect(ours.map((item) => item.id)).toEqual([first, later]);
      expect(ours[0]).toEqual({
        id: first,
        discipline: 'surf',
        level: 'beginner',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        capacity: 2,
        seatsTaken: 1,
        location: { name: locationName },
        requests: [
          { id: anaRequest, requestedAt: '2026-10-13T12:00:00.000Z', student: { id: ana.id, name: 'Ana', photoUrl: null } },
          { id: biaRequest, requestedAt: '2026-10-13T12:05:00.000Z', student: { id: bia.id, name: 'Bia', photoUrl: null } },
        ],
      });
      expect(ours[1]).toMatchObject({ id: later, seatsTaken: 0, requests: [{ student: { id: ana.id } }] });
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('leaves out classes that started, are cancelled or have no pending request', async () => {
      const admin = await account('admin');
      const student = await account();
      const started = await makeClass(admin.id);
      const cancelled = await makeClass(admin.id, { cancelledAt: new Date('2026-10-13T10:00:00.000Z') });
      const decided = await makeClass(admin.id);
      await seedEnrolment(started, student.id, 'pending');
      await seedEnrolment(cancelled, student.id, 'pending');
      await seedEnrolment(decided, student.id, 'denied');

      now = new Date(new Date(STARTS_AT).getTime() + 1000);
      const response = await listPending(admin.accessToken);
      expect(response.status).toBe(200);
      expect((response.body.classes as { id: string }[]).some((item) => classIds.includes(item.id))).toBe(false);

      now = NOW;
      const open = await listPending(admin.accessToken);
      expect((open.body.classes as { id: string }[]).filter((item) => classIds.includes(item.id)).map((item) => item.id)).toEqual([started]);
    });

    it('refuses anyone but an approved admin', async () => {
      const student = await account();
      const instructor = await account('instructor');

      for (const person of [student, instructor]) {
        const response = await listPending(person.accessToken);
        expect([response.status, response.body.errors]).toEqual([403, ['user.role.notAdmin']]);
      }
      for (const status of NOT_APPROVED) {
        const other = await account('admin', status);
        const response = await listPending(other.accessToken);
        expect([response.status, response.body.errors]).toEqual([403, ['user.status.notApproved']]);
      }
      expect((await listPending(undefined)).status).toBe(401);
    });
  });

  describe('approves', () => {
    it('approves a pending request while there is a free seat', async () => {
      const admin = await account('admin');
      const student = await account('student', 'approved', 'Ana');
      const classId = await makeClass(admin.id, { capacity: 2 });
      const id = await seedEnrolment(classId, student.id, 'pending');

      const response = await approve(admin.accessToken, id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id, classId, status: 'approved', requestedAt: '2026-10-13T12:00:00.000Z' });
      expect(await enrolmentOf(id)).toMatchObject({ status: 'approved', decidedAt: NOW });
      const detail = await as(admin.accessToken, http().get(`/classes/${classId}`));
      expect(detail.body.seatsTaken).toBe(1);
      expect(detail.body.students).toEqual([{ id: student.id, name: 'Ana', photoUrl: null, enrolmentId: id }]);
    });

    it('answers each refusal in order and writes nothing', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      const other = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      const pending = await seedEnrolment(classId, student.id, 'pending');
      await seedEnrolment(classId, other.id, 'approved');
      const decided = await seedEnrolment(await makeClass(admin.id), student.id, 'denied');
      const started = await seedEnrolment(await makeClass(admin.id, { startsAt: '2026-10-14T12:00:00.000Z' }), student.id, 'pending');

      for (const person of [student, instructor]) {
        const response = await approve(person.accessToken, pending);
        expect([response.status, response.body.errors]).toEqual([403, ['user.role.notAdmin']]);
      }
      for (const id of ['not-a-uuid', randomUUID()]) {
        const response = await approve(admin.accessToken, id);
        expect([response.status, response.body.errors]).toEqual([404, ['enrolment.notFound']]);
      }
      const notPending = await approve(admin.accessToken, decided);
      expect([notPending.status, notPending.body.errors]).toEqual([409, ['enrolment.notPending']]);
      const classStarted = await approve(admin.accessToken, started);
      expect([classStarted.status, classStarted.body.errors]).toEqual([409, ['class.started']]);
      const full = await approve(admin.accessToken, pending);
      expect([full.status, full.body.errors]).toEqual([409, ['enrolment.class.full']]);
      expect((await approve(undefined, pending)).status).toBe(401);

      expect((await enrolmentOf(pending)).status).toBe('pending');
      expect((await enrolmentOf(started)).status).toBe('pending');
      expect(await prisma.notification.count({ where: { userId: student.id, type: 'enrolment.approved' } })).toBe(0);
    });

    it('leaves exactly one approved when two requests race for the last seat', async () => {
      const admin = await account('admin');
      const ana = await account();
      const bia = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      const anaRequest = await seedEnrolment(classId, ana.id, 'pending');
      const biaRequest = await seedEnrolment(classId, bia.id, 'pending');

      const responses = await Promise.all([approve(admin.accessToken, anaRequest), approve(admin.accessToken, biaRequest)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)!.body.errors).toEqual(['enrolment.class.full']);
      expect(await prisma.enrolment.count({ where: { classId, status: 'approved' } })).toBe(1);
      expect(await prisma.enrolment.count({ where: { classId, status: 'pending' } })).toBe(1);
    });

    it('lets exactly one of two simultaneous approvals of the same request win', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);
      const id = await seedEnrolment(classId, student.id, 'pending');

      const responses = await Promise.all([approve(admin.accessToken, id), approve(admin.accessToken, id)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)!.body.errors).toEqual(['enrolment.notPending']);
    });
  });

  describe('denies', () => {
    it('stores the reason trimmed', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      const other = await account();
      await seedEnrolment(classId, other.id, 'approved');
      const id = await seedEnrolment(classId, student.id, 'pending');

      const response = await deny(admin.accessToken, id, { reason: '  Esta aula é de nível avançado.  ' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id, classId, status: 'denied', requestedAt: '2026-10-13T12:00:00.000Z' });
      expect(await enrolmentOf(id)).toMatchObject({
        status: 'denied',
        reason: 'Esta aula é de nível avançado.',
        decidedAt: NOW,
      });
      const mine = await as(student.accessToken, http().get(`/classes/${classId}`));
      expect(mine.body.myEnrolment).toEqual({
        id,
        status: 'denied',
        requestedAt: '2026-10-13T12:00:00.000Z',
        reason: 'Esta aula é de nível avançado.',
      });
    });

    it.each([[{}], [{ reason: '' }], [{ reason: '   ' }], [{ reason: null }]])(
      'stores no reason for the body %j',
      async (body) => {
        const admin = await account('admin');
        const student = await account();
        const id = await seedEnrolment(await makeClass(admin.id), student.id, 'pending');

        const response = await deny(admin.accessToken, id, body);

        expect(response.status).toBe(200);
        expect((await enrolmentOf(id)).reason).toBeNull();
      },
    );

    it('refuses what it cannot deny and writes nothing', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);
      const pending = await seedEnrolment(classId, student.id, 'pending');
      const decided = await seedEnrolment(await makeClass(admin.id), student.id, 'approved');
      const started = await seedEnrolment(await makeClass(admin.id, { startsAt: '2026-10-14T12:00:00.000Z' }), student.id, 'pending');

      for (const reason of ['a'.repeat(501), 42]) {
        const response = await deny(admin.accessToken, pending, { reason });
        expect([response.status, response.body.errors]).toEqual([422, ['enrolment.reason.max.length']]);
      }
      expect((await deny(admin.accessToken, pending, { reason: 'a'.repeat(500) })).status).toBe(200);
      const notFound = await deny(admin.accessToken, 'not-a-uuid', { reason: 'a'.repeat(501) });
      expect([notFound.status, notFound.body.errors]).toEqual([404, ['enrolment.notFound']]);
      const notPending = await deny(admin.accessToken, decided);
      expect([notPending.status, notPending.body.errors]).toEqual([409, ['enrolment.notPending']]);
      const classStarted = await deny(admin.accessToken, started);
      expect([classStarted.status, classStarted.body.errors]).toEqual([409, ['class.started']]);
      expect((await deny(student.accessToken, started)).status).toBe(403);
      expect((await deny(undefined, started)).status).toBe(401);

      expect((await enrolmentOf(decided)).status).toBe('approved');
      expect((await enrolmentOf(started)).status).toBe('pending');
    });
  });

  describe('notifies the student', () => {
    const pushesFor = (classId: string, type: string) =>
      push.sent.filter((message) => message.type === type && (message.params as { classId?: string }).classId === classId);

    it('tells the student of the approval, nobody else', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      const waiting = await account();
      for (const person of [admin, instructor, student, waiting]) await withPhone(person.id);
      const classId = await makeClass(admin.id, { capacity: 1 });
      const id = await seedEnrolment(classId, student.id, 'pending');
      await seedEnrolment(classId, waiting.id, 'pending');

      expect((await approve(admin.accessToken, id)).status).toBe(200);

      const [stored] = await notificationsOf(student.id, 'enrolment.approved');
      expect(stored!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT });
      for (const other of [admin, instructor, waiting]) {
        expect(await prisma.notification.count({ where: { userId: other.id, type: { in: ['enrolment.approved', 'enrolment.denied'] } } })).toBe(0);
      }
      const sent = pushesFor(classId, 'enrolment.approved');
      expect(sent).toHaveLength(1);
      expect(renderPush('enrolment.approved', sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Pedido aprovado',
        body: 'Sua vaga na aula de Surf de 15/10 às 08:00 está confirmada.',
      });
    });

    it('tells the student of the denial with the reason as written, or without one', async () => {
      const admin = await account('admin');
      const withReason = await account();
      const without = await account();
      await withPhone(withReason.id);
      await withPhone(without.id);
      const classId = await makeClass(admin.id);
      const first = await seedEnrolment(classId, withReason.id, 'pending');
      const second = await seedEnrolment(classId, without.id, 'pending');

      expect((await deny(admin.accessToken, first, { reason: ' Esta aula é de nível avançado. ' })).status).toBe(200);
      expect((await deny(admin.accessToken, second)).status).toBe(200);

      const [reasoned] = await notificationsOf(withReason.id, 'enrolment.denied');
      expect(reasoned!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT, reason: 'Esta aula é de nível avançado.' });
      const [plain] = await notificationsOf(without.id, 'enrolment.denied');
      expect(plain!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT });
      const bodies = pushesFor(classId, 'enrolment.denied').map((message) => renderPush('enrolment.denied', message.params, 'pt-BR'));
      expect(bodies).toEqual(
        expect.arrayContaining([
          { title: 'Pedido recusado', body: 'Esta aula é de nível avançado.' },
          { title: 'Pedido recusado', body: 'A escola recusou seu pedido para a aula de Surf de 15/10 às 08:00.' },
        ]),
      );
    });

    it('keeps the decision when the push provider fails', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(student.id);
      const classId = await makeClass(admin.id);
      const id = await seedEnrolment(classId, student.id, 'pending');
      push.failing = true;

      const response = await approve(admin.accessToken, id);

      expect(response.status).toBe(200);
      expect((await enrolmentOf(id)).status).toBe('approved');
    });

    it('tells nobody when a seat opens', async () => {
      const admin = await account('admin');
      const seated = await account();
      const waiting = await account();
      await withPhone(waiting.id);
      const classId = await makeClass(admin.id, { capacity: 1 });
      const seatedRequest = await seedEnrolment(classId, seated.id, 'approved');
      await seedEnrolment(classId, waiting.id, 'pending');

      await prisma.enrolment.update({ where: { id: seatedRequest }, data: { status: 'cancelled', endedAt: NOW } });

      expect(await prisma.notification.count({ where: { userId: waiting.id } })).toBe(0);
      expect(pushesFor(classId, 'enrolment.approved')).toHaveLength(0);
    });
  });
});
