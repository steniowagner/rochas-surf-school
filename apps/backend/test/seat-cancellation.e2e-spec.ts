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

const DOMAIN = 'seat-cancellation.e2e.example.com';
const MARK = 'e2ecancel';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
// Tomorrow 08:00-09:00 in Fortaleza.
const STARTS_AT = '2026-10-15T11:00:00.000Z';
const ENDS_AT = '2026-10-15T12:00:00.000Z';
// Tonight 20:00 in Fortaleza: the class's cancellation deadline.
const DEADLINE = '2026-10-14T23:00:00.000Z';

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

describe('Seat cancellation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let now: Date;
  let locationId: string;
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
    locationId = (
      await prisma.location.create({
        data: { id: randomUUID(), name: `${MARK} ${randomUUID().slice(0, 8)}`, nameKey: `${MARK} ${randomUUID()}`, address: 'Av. Beira Mar' },
      })
    ).id;
  });

  afterEach(async () => {
    // The admins already in the database were told too: the notifications of our classes go first, then the classes
    // (their enrolments cascade) and the users.
    await prisma.notification.deleteMany({
      where: { type: 'enrolment.cancelled', OR: classIds.map((id) => ({ params: { path: ['classId'], equals: id } })) },
    });
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
    overrides: { startsAt?: string; capacity?: number; cancellationDeadline?: string | null; instructorIds?: string[] } = {},
  ) {
    const id = randomUUID();
    classIds.push(id);
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date(overrides.startsAt ?? STARTS_AT),
        endsAt: new Date(ENDS_AT),
        locationId,
        capacity: overrides.capacity ?? 8,
        createdBy: creatorId,
        cancellationDeadline:
          overrides.cancellationDeadline === undefined ? new Date(DEADLINE) : overrides.cancellationDeadline && new Date(overrides.cancellationDeadline),
        instructors: { create: (overrides.instructorIds ?? []).map((userId) => ({ userId })) },
      },
    });
    return id;
  }

  async function seedEnrolment(classId: string, studentId: string, status: EnrolmentStatus) {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: {
        id,
        classId,
        studentId,
        status,
        requestedAt: new Date('2026-10-13T12:00:00.000Z'),
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

  const cancel = (token: string | undefined, id: string) => as(token, http().post(`/enrolments/${id}/cancel`));
  const enrolmentOf = (id: string) => prisma.enrolment.findUniqueOrThrow({ where: { id } });
  const cancelledNotifications = (classId: string) =>
    prisma.notification.findMany({ where: { type: 'enrolment.cancelled', params: { path: ['classId'], equals: classId } } });

  describe('cancels', () => {
    it('gives the seat up before the deadline and frees it', async () => {
      const admin = await account('admin');
      const ana = await account('student', 'approved', 'Ana');
      const bia = await account('student', 'approved', 'Bia');
      const classId = await makeClass(admin.id, { capacity: 1 });
      const id = await seedEnrolment(classId, ana.id, 'approved');
      const biaRequest = await seedEnrolment(classId, bia.id, 'pending');

      const response = await cancel(ana.accessToken, id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id, classId, status: 'cancelled', requestedAt: '2026-10-13T12:00:00.000Z' });
      expect(await enrolmentOf(id)).toMatchObject({ status: 'cancelled', endedAt: NOW });
      const detail = await as(admin.accessToken, http().get(`/classes/${classId}`));
      expect(detail.body.seatsTaken).toBe(0);
      expect(detail.body.students).toEqual([]);
      const mine = await as(ana.accessToken, http().get(`/classes/${classId}`));
      expect(mine.body.myEnrolment).toMatchObject({ id, status: 'cancelled' });
      // The seat is free for the student who was waiting.
      const approved = await as(admin.accessToken, http().post(`/enrolments/${biaRequest}/approve`));
      expect(approved.status).toBe(200);
    });

    it('answers a second cancel with enrolment.notApproved', async () => {
      const admin = await account('admin');
      const ana = await account();
      const id = await seedEnrolment(await makeClass(admin.id), ana.id, 'approved');

      expect((await cancel(ana.accessToken, id)).status).toBe(200);
      const again = await cancel(ana.accessToken, id);

      expect([again.status, again.body.errors]).toEqual([409, ['enrolment.notApproved']]);
    });

    it('lets exactly one of two simultaneous cancels win', async () => {
      const admin = await account('admin');
      const ana = await account();
      const id = await seedEnrolment(await makeClass(admin.id), ana.id, 'approved');

      const responses = await Promise.all([cancel(ana.accessToken, id), cancel(ana.accessToken, id)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    });
  });

  describe('refuses', () => {
    it('answers each refusal in order and writes nothing', async () => {
      const admin = await account('admin');
      const ana = await account();
      const bia = await account();
      const mine = await seedEnrolment(await makeClass(admin.id), ana.id, 'approved');
      const pending = await seedEnrolment(await makeClass(admin.id), ana.id, 'pending');
      const withdrawn = await seedEnrolment(await makeClass(admin.id), ana.id, 'withdrawn');
      const started = await seedEnrolment(await makeClass(admin.id, { startsAt: '2026-10-14T12:00:00.000Z' }), ana.id, 'approved');
      const noDeadline = await seedEnrolment(await makeClass(admin.id, { cancellationDeadline: null }), ana.id, 'approved');
      const passed = await seedEnrolment(await makeClass(admin.id, { cancellationDeadline: '2026-10-14T12:00:00.000Z' }), ana.id, 'approved');
      const atDeadline = await seedEnrolment(await makeClass(admin.id, { cancellationDeadline: NOW.toISOString() }), ana.id, 'approved');

      for (const id of ['not-a-uuid', randomUUID()]) {
        const response = await cancel(ana.accessToken, id);
        expect([response.status, response.body.errors]).toEqual([404, ['enrolment.notFound']]);
      }
      const another = await cancel(bia.accessToken, mine);
      expect([another.status, another.body.errors]).toEqual([404, ['enrolment.notFound']]);
      for (const [id, status, error] of [
        [pending, 409, 'enrolment.notApproved'],
        [withdrawn, 409, 'enrolment.notApproved'],
        [started, 409, 'class.started'],
        [noDeadline, 409, 'enrolment.deadline.missing'],
        [passed, 409, 'enrolment.deadline.passed'],
        [atDeadline, 409, 'enrolment.deadline.passed'],
      ] as const) {
        const response = await cancel(ana.accessToken, id);
        expect([id, response.status, response.body.errors]).toEqual([id, status, [error]]);
      }
      expect((await cancel(undefined, mine)).status).toBe(401);
      for (const status of NOT_APPROVED) {
        const person = await account('student', status);
        const response = await cancel(person.accessToken, mine);
        expect([response.status, response.body.errors]).toEqual([403, ['user.status.notApproved']]);
      }

      for (const id of [mine, started, noDeadline, passed, atDeadline]) {
        expect((await enrolmentOf(id)).status).toBe('approved');
      }
      expect(await cancelledNotifications(classIds[0]!)).toEqual([]);
    });
  });

  describe('notifies', () => {
    const pushesFor = (classId: string) =>
      push.sent.filter((message) => message.type === 'enrolment.cancelled' && (message.params as { classId?: string }).classId === classId);

    it('tells the admins and the instructor once, with the waiting count', async () => {
      const admin = await account('admin');
      const teachingAdmin = await account('admin');
      const instructor = await account('instructor');
      const ana = await account('student', 'approved', 'Ana Souza');
      const waitingA = await account();
      const waitingB = await account();
      for (const person of [admin, instructor, ana]) await withPhone(person.id);
      const classId = await makeClass(admin.id, { instructorIds: [instructor.id, teachingAdmin.id] });
      const id = await seedEnrolment(classId, ana.id, 'approved');
      await seedEnrolment(classId, waitingA.id, 'pending');
      await seedEnrolment(classId, waitingB.id, 'pending');

      expect((await cancel(ana.accessToken, id)).status).toBe(200);

      const stored = await cancelledNotifications(classId);
      const params = { classId, studentName: 'Ana Souza', discipline: 'surf', startsAt: STARTS_AT, waitingCount: 2 };
      // Every approved admin of the database is told, each person once; the student is not.
      expect(new Set(stored.map((item) => item.userId)).size).toBe(stored.length);
      for (const person of [admin, teachingAdmin, instructor]) {
        expect(stored.find((item) => item.userId === person.id)?.params).toEqual(params);
      }
      expect(stored.some((item) => item.userId === ana.id)).toBe(false);
      const sent = pushesFor(classId);
      expect(sent.length).toBeGreaterThanOrEqual(2);
      expect(sent.every((message) => message.token.includes(MARK))).toBe(true);
      expect(renderPush('enrolment.cancelled', sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Vaga cancelada',
        body: 'Ana Souza cancelou a vaga na aula de Surf de 15/10 às 08:00. 2 na lista de espera.',
      });
    });

    it('ends the text after the class when nobody waits', async () => {
      const admin = await account('admin');
      const ana = await account('student', 'approved', 'Ana Souza');
      await withPhone(admin.id);
      const classId = await makeClass(admin.id);
      const id = await seedEnrolment(classId, ana.id, 'approved');

      expect((await cancel(ana.accessToken, id)).status).toBe(200);

      const [message] = pushesFor(classId);
      expect(renderPush('enrolment.cancelled', message!.params, 'pt-BR').body).toBe(
        'Ana Souza cancelou a vaga na aula de Surf de 15/10 às 08:00.',
      );
    });

    it('answers the cancellation even when the push fails', async () => {
      const admin = await account('admin');
      const ana = await account();
      await withPhone(admin.id);
      push.failing = true;
      const id = await seedEnrolment(await makeClass(admin.id), ana.id, 'approved');

      const response = await cancel(ana.accessToken, id);

      expect(response.status).toBe(200);
      expect((await enrolmentOf(id)).status).toBe('cancelled');
    });
  });
});
