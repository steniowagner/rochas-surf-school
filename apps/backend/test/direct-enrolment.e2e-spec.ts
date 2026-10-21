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

const DOMAIN = 'direct-enrolment.e2e.example.com';
const MARK = 'e2edirect';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
// Tomorrow 08:00-09:00 in Fortaleza.
const STARTS_AT = '2026-10-15T11:00:00.000Z';
const ENDS_AT = '2026-10-15T12:00:00.000Z';

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

describe('Direct enrolment and take-out (e2e)', () => {
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

  const enrol = (token: string | undefined, classId: string, studentId: unknown) =>
    as(token, http().post(`/classes/${classId}/enrolments/direct`)).send({ studentId });
  const takeOut = (token: string | undefined, id: string, body?: Record<string, unknown>) =>
    as(token, http().post(`/enrolments/${id}/take-out`)).send(body ?? {});

  const enrolmentOf = (id: string) => prisma.enrolment.findUniqueOrThrow({ where: { id } });
  const notificationsOf = (userId: string, type: string) => prisma.notification.findMany({ where: { userId, type } });
  const pushesFor = (classId: string, type: string) =>
    push.sent.filter((message) => message.type === type && (message.params as { classId?: string }).classId === classId);
  const errorsOf = (response: request.Response) => [response.status, response.body.errors];

  describe('enrols directly', () => {
    it('stores an approved enrolment, takes the seat and shows the student on the class', async () => {
      const admin = await account('admin');
      const student = await account('student', 'approved', 'Ana');
      const classId = await makeClass(admin.id, { capacity: 1 });

      const response = await enrol(admin.accessToken, classId, student.id);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: expect.any(String), classId, status: 'approved', requestedAt: NOW.toISOString() });
      expect(await enrolmentOf(response.body.id)).toMatchObject({
        studentId: student.id,
        status: 'approved',
        ruleAcceptedAt: null,
        decidedAt: NOW,
      });
      const details = await as(admin.accessToken, http().get(`/classes/${classId}`));
      expect(details.body.seatsTaken).toBe(1);
      expect(details.body.students).toEqual([
        { id: student.id, name: 'Ana', photoUrl: null, enrolmentId: response.body.id },
      ]);
    });

    it('approves the pending request of the student instead of storing another', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);
      const id = await seedEnrolment(classId, student.id, 'pending');

      const response = await enrol(admin.accessToken, classId, student.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id, classId, status: 'approved', requestedAt: '2026-10-13T12:00:00.000Z' });
      expect(await enrolmentOf(id)).toMatchObject({ status: 'approved', decidedAt: NOW });
      expect(await prisma.enrolment.count({ where: { classId, studentId: student.id } })).toBe(1);
    });

    it('enrols again after an earlier enrolment ended', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);
      await seedEnrolment(classId, student.id, 'cancelled');

      expect((await enrol(admin.accessToken, classId, student.id)).status).toBe(201);
      expect(await prisma.enrolment.count({ where: { classId, studentId: student.id } })).toBe(2);
    });

    it('answers enrolment.class.full when the seats are taken, leaving a pending request alone', async () => {
      const admin = await account('admin');
      const seated = await account();
      const waiting = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      await seedEnrolment(classId, seated.id, 'approved');
      const pending = await seedEnrolment(classId, waiting.id, 'pending');

      expect(errorsOf(await enrol(admin.accessToken, classId, waiting.id))).toEqual([409, ['enrolment.class.full']]);
      expect((await enrolmentOf(pending)).status).toBe('pending');
    });

    it('refuses what it cannot enrol and writes nothing', async () => {
      const admin = await account('admin');
      const student = await account();
      const holder = await account();
      const classId = await makeClass(admin.id);
      await seedEnrolment(classId, holder.id, 'approved');
      const started = await makeClass(admin.id, { startsAt: '2026-10-14T12:00:00.000Z', endsAt: '2026-10-14T14:00:00.000Z' });
      const cancelled = await makeClass(admin.id, { cancelledAt: NOW });
      const instructor = await account('instructor');
      const pendingAccount = await account('student', 'pending');
      const deletedAccount = await account('student', 'deleted');

      expect(errorsOf(await enrol(admin.accessToken, classId, holder.id))).toEqual([409, ['enrolment.alreadyApproved']]);
      expect(errorsOf(await enrol(admin.accessToken, started, student.id))).toEqual([409, ['class.started']]);
      expect(errorsOf(await enrol(admin.accessToken, cancelled, student.id))).toEqual([409, ['class.cancelled']]);
      expect(errorsOf(await enrol(admin.accessToken, randomUUID(), student.id))).toEqual([404, ['class.notFound']]);
      expect(errorsOf(await enrol(admin.accessToken, 'not-a-uuid', student.id))).toEqual([404, ['class.notFound']]);
      for (const studentId of [instructor.id, admin.id, pendingAccount.id, deletedAccount.id, randomUUID(), 'x', undefined, 7]) {
        expect(errorsOf(await enrol(admin.accessToken, classId, studentId))).toEqual([422, ['enrolment.student.invalid']]);
      }
      expect(await prisma.enrolment.count({ where: { classId: { in: classIds } } })).toBe(1);
    });

    it('answers 403 to anyone but an approved admin and 401 without a token', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);

      for (const role of ['student', 'instructor'] as const) {
        const other = await account(role);
        expect(errorsOf(await enrol(other.accessToken, classId, student.id))).toEqual([403, ['user.role.notAdmin']]);
      }
      for (const status of NOT_APPROVED) {
        const other = await account('admin', status);
        expect(errorsOf(await enrol(other.accessToken, classId, student.id))[0]).toBe(403);
      }
      expect((await enrol(undefined, classId, student.id)).status).toBe(401);
      expect(await prisma.enrolment.count({ where: { classId } })).toBe(0);
    });

    it('leaves exactly one seat when two admins enrol different students into the last one', async () => {
      const admin = await account('admin');
      const ana = await account();
      const bia = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });

      const responses = await Promise.all([enrol(admin.accessToken, classId, ana.id), enrol(admin.accessToken, classId, bia.id)]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(responses.find((response) => response.status === 409)!.body.errors).toEqual(['enrolment.class.full']);
      expect(await prisma.enrolment.count({ where: { classId, status: 'approved' } })).toBe(1);
    });

    it('leaves exactly one seat when the same student is enrolled twice at once', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);

      const responses = await Promise.all([enrol(admin.accessToken, classId, student.id), enrol(admin.accessToken, classId, student.id)]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(await prisma.enrolment.count({ where: { classId, studentId: student.id, status: 'approved' } })).toBe(1);
    });
  });

  describe('notifies on a direct enrolment', () => {
    it('tells the student, nobody else, in the student locale', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      for (const person of [admin, instructor, student]) await withPhone(person.id);
      const classId = await makeClass(admin.id);

      expect((await enrol(admin.accessToken, classId, student.id)).status).toBe(201);

      const [stored] = await notificationsOf(student.id, 'enrolment.enrolled');
      expect(stored!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT });
      for (const other of [admin, instructor]) {
        expect(await prisma.notification.count({ where: { userId: other.id } })).toBe(0);
      }
      const sent = pushesFor(classId, 'enrolment.enrolled');
      expect(sent).toHaveLength(1);
      expect(renderPush('enrolment.enrolled', sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Você foi inscrito',
        body: 'A escola inscreveu você na aula de Surf de 15/10 às 08:00.',
      });
    });

    it('tells the student the pending request was approved instead', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(student.id);
      const classId = await makeClass(admin.id);
      await seedEnrolment(classId, student.id, 'pending');

      expect((await enrol(admin.accessToken, classId, student.id)).status).toBe(200);

      expect(await notificationsOf(student.id, 'enrolment.enrolled')).toHaveLength(0);
      expect(await notificationsOf(student.id, 'enrolment.approved')).toHaveLength(1);
      expect(pushesFor(classId, 'enrolment.approved')).toHaveLength(1);
    });

    it('keeps the enrolment when the push provider fails', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(student.id);
      const classId = await makeClass(admin.id);
      push.failing = true;

      const response = await enrol(admin.accessToken, classId, student.id);

      expect(response.status).toBe(201);
      expect((await enrolmentOf(response.body.id)).status).toBe('approved');
    });
  });

  describe('takes out', () => {
    it('ends the seat with the trimmed reason, frees it and removes the student from the class', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, { capacity: 1 });
      const id = await seedEnrolment(classId, student.id, 'approved');

      const response = await takeOut(admin.accessToken, id, { reason: '  Esta turma é de nível avançado.  ' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id, classId, status: 'takenOut', requestedAt: '2026-10-13T12:00:00.000Z' });
      expect(await enrolmentOf(id)).toMatchObject({
        status: 'takenOut',
        reason: 'Esta turma é de nível avançado.',
        endedAt: NOW,
      });
      const details = await as(admin.accessToken, http().get(`/classes/${classId}`));
      expect(details.body).toMatchObject({ seatsTaken: 0, students: [] });
      const mine = await as(student.accessToken, http().get(`/classes/${classId}`));
      expect(mine.body.myEnrolment).toMatchObject({ id, status: 'takenOut', reason: 'Esta turma é de nível avançado.' });
      expect((await enrol(admin.accessToken, classId, student.id)).status).toBe(201);
    });

    it.each([[{}], [{ reason: '' }], [{ reason: '   ' }], [{ reason: null }]])(
      'stores no reason for the body %j',
      async (body) => {
        const admin = await account('admin');
        const student = await account();
        const id = await seedEnrolment(await makeClass(admin.id), student.id, 'approved');

        expect((await takeOut(admin.accessToken, id, body)).status).toBe(200);
        expect((await enrolmentOf(id)).reason).toBeNull();
      },
    );

    it('refuses what it cannot take out and writes nothing', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id);
      const approved = await seedEnrolment(classId, student.id, 'approved');
      const pending = await seedEnrolment(await makeClass(admin.id), student.id, 'pending');
      const gone = await seedEnrolment(await makeClass(admin.id), student.id, 'takenOut');
      const started = await seedEnrolment(
        await makeClass(admin.id, { startsAt: '2026-10-14T12:00:00.000Z', endsAt: '2026-10-14T14:00:00.000Z' }),
        student.id,
        'approved',
      );

      for (const reason of ['a'.repeat(301), 42]) {
        expect(errorsOf(await takeOut(admin.accessToken, approved, { reason }))).toEqual([422, ['enrolment.reason.max.length']]);
      }
      expect((await takeOut(admin.accessToken, approved, { reason: 'a'.repeat(300) })).status).toBe(200);
      expect(errorsOf(await takeOut(admin.accessToken, approved))).toEqual([409, ['enrolment.notApproved']]);
      expect(errorsOf(await takeOut(admin.accessToken, pending))).toEqual([409, ['enrolment.notApproved']]);
      expect(errorsOf(await takeOut(admin.accessToken, gone))).toEqual([409, ['enrolment.notApproved']]);
      expect(errorsOf(await takeOut(admin.accessToken, started))).toEqual([409, ['class.started']]);
      expect(errorsOf(await takeOut(admin.accessToken, randomUUID()))).toEqual([404, ['enrolment.notFound']]);
      expect(errorsOf(await takeOut(admin.accessToken, 'not-a-uuid'))).toEqual([404, ['enrolment.notFound']]);
      expect((await enrolmentOf(pending)).status).toBe('pending');
      expect((await enrolmentOf(started)).status).toBe('approved');
    });

    it('answers 403 to anyone but an approved admin and 401 without a token', async () => {
      const admin = await account('admin');
      const student = await account();
      const id = await seedEnrolment(await makeClass(admin.id), student.id, 'approved');

      for (const role of ['student', 'instructor'] as const) {
        const other = await account(role);
        expect(errorsOf(await takeOut(other.accessToken, id))).toEqual([403, ['user.role.notAdmin']]);
      }
      expect((await takeOut(undefined, id)).status).toBe(401);
      expect((await enrolmentOf(id)).status).toBe('approved');
    });

    it('leaves exactly one winner when two take-outs race', async () => {
      const admin = await account('admin');
      const student = await account();
      const id = await seedEnrolment(await makeClass(admin.id), student.id, 'approved');

      const responses = await Promise.all([takeOut(admin.accessToken, id), takeOut(admin.accessToken, id)]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    });
  });

  describe('notifies on a take-out', () => {
    it('tells the student with the reason as written, or without one, nobody else', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const withReason = await account();
      const without = await account();
      for (const person of [admin, instructor, withReason, without]) await withPhone(person.id);
      const classId = await makeClass(admin.id);
      const first = await seedEnrolment(classId, withReason.id, 'approved');
      const second = await seedEnrolment(classId, without.id, 'approved');

      expect((await takeOut(admin.accessToken, first, { reason: ' Esta turma é de nível avançado. ' })).status).toBe(200);
      expect((await takeOut(admin.accessToken, second)).status).toBe(200);

      const [reasoned] = await notificationsOf(withReason.id, 'enrolment.takenOut');
      expect(reasoned!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT, reason: 'Esta turma é de nível avançado.' });
      const [plain] = await notificationsOf(without.id, 'enrolment.takenOut');
      expect(plain!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT });
      for (const other of [admin, instructor]) {
        expect(await prisma.notification.count({ where: { userId: other.id } })).toBe(0);
      }
      const bodies = pushesFor(classId, 'enrolment.takenOut').map((message) => renderPush('enrolment.takenOut', message.params, 'pt-BR'));
      expect(bodies).toEqual(
        expect.arrayContaining([
          { title: 'Você foi retirado de uma aula', body: 'Esta turma é de nível avançado.' },
          { title: 'Você foi retirado de uma aula', body: 'A escola retirou você da aula de Surf de 15/10 às 08:00.' },
        ]),
      );
    });

    it('keeps the take-out when the push provider fails', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(student.id);
      const id = await seedEnrolment(await makeClass(admin.id), student.id, 'approved');
      push.failing = true;

      expect((await takeOut(admin.accessToken, id)).status).toBe(200);
      expect((await enrolmentOf(id)).status).toBe('takenOut');
    });
  });
});
