import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  PushMessage,
  PushReceipt,
  PushSendTicket,
} from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { EnrolmentExpiryJob } from '../src/modules/enrolment/enrolment-expiry.job.js';
import { SystemClockProvider as EnrolmentClockProvider } from '../src/modules/enrolment/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'enrolment.e2e.example.com';
const MARK = 'e2eenrolment';
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

describe('Enrolment (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let now: Date;
  let locationId: string;
  let classIds: string[];
  let storedSettings: { id: string; whatsappNumber: string | null; waitingListEnabled: boolean }[];
  let storedRules: { discipline: 'surf' | 'skate'; text: string; updatedBy: string | null }[];

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
        data: {
          id: randomUUID(),
          name: `${MARK} ${randomUUID().slice(0, 8)}`,
          nameKey: `${MARK} ${randomUUID()}`,
          address: 'Av. Beira Mar',
        },
      })
    ).id;
    // The rules are shared by every suite: keep what is there and put it back.
    storedRules = await prisma.cancellationRule.findMany();
    storedSettings = await prisma.schoolSettings.findMany();
    await setRule('surf', 'Cancele até 1 hora antes.');
    await setRule('skate', null);
  });

  afterEach(async () => {
    // The admins of the school are told of every request, also the ones that are not ours: take those back.
    if (classIds.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          type: { in: ['enrolment.requested', 'enrolment.expired'] },
          OR: classIds.map((id) => ({ params: { path: ['classId'], equals: id } })),
        },
      });
    }
    // Classes go first: their enrolments cascade, and the students are restricted by them.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await prisma.cancellationRule.deleteMany();
    if (storedRules.length > 0) {
      await prisma.cancellationRule.createMany({ data: storedRules });
    }
    await prisma.schoolSettings.deleteMany();
    if (storedSettings.length > 0) {
      await prisma.schoolSettings.createMany({ data: storedSettings });
    }
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  async function setRule(discipline: 'surf' | 'skate', text: string | null) {
    if (text === null) {
      await prisma.cancellationRule.deleteMany({ where: { discipline } });
      return;
    }
    await prisma.cancellationRule.upsert({
      where: { discipline },
      create: { discipline, text },
      update: { text },
    });
  }

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
    return { id: user.id, accessToken: tokens.signAccessToken({ id: user.id, email: user.email! }).token };
  }

  async function makeClass(
    creatorId: string,
    instructorIds: string[],
    overrides: {
      startsAt?: string;
      endsAt?: string;
      capacity?: number;
      discipline?: 'surf' | 'skate';
      cancelledAt?: Date;
    } = {},
  ) {
    const id = randomUUID();
    classIds.push(id);
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: overrides.discipline ?? 'surf',
        level: 'beginner',
        startsAt: new Date(overrides.startsAt ?? STARTS_AT),
        endsAt: new Date(overrides.endsAt ?? ENDS_AT),
        locationId,
        capacity: overrides.capacity ?? 8,
        createdBy: creatorId,
        cancelledAt: overrides.cancelledAt ?? null,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
    return id;
  }

  async function seedEnrolment(
    classId: string,
    studentId: string,
    status: EnrolmentStatus,
    extra: { requestedAt?: Date; decidedAt?: Date } = {},
  ) {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: {
        id,
        classId,
        studentId,
        status,
        requestedAt: extra.requestedAt ?? new Date('2026-10-13T12:00:00.000Z'),
        decidedAt: extra.decidedAt ?? null,
      },
    });
    return id;
  }

  async function withPhone(userId: string, locale = 'pt-BR') {
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
    });
  }

  const requestSeat = (token: string | undefined, classId: string, body?: Record<string, unknown>) =>
    as(token, http().post(`/classes/${classId}/enrolments`)).send(body ?? { acceptCancellationRule: true });

  const withdraw = (token: string | undefined, id: string) => as(token, http().post(`/enrolments/${id}/withdraw`));

  const enrolmentsOf = (classId: string) =>
    prisma.enrolment.findMany({ where: { classId }, orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }] });

  const notificationsOf = (userId: string, type: string) =>
    prisma.notification.findMany({ where: { userId, type } });

  describe('requests a seat', () => {
    it('stores a pending enrolment with the rule acceptance time', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);

      const response = await requestSeat(student.accessToken, classId);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        classId,
        status: 'pending',
        requestedAt: NOW.toISOString(),
      });
      const [stored] = await enrolmentsOf(classId);
      expect(stored).toMatchObject({
        id: response.body.id,
        studentId: student.id,
        status: 'pending',
        requestedAt: NOW,
        ruleAcceptedAt: NOW,
        decidedAt: null,
        endedAt: null,
      });
    });

    it('accepts a full class the same way', async () => {
      const admin = await account('admin');
      const student = await account();
      const seated = await account('student', 'approved', 'Seated');
      const classId = await makeClass(admin.id, [admin.id], { capacity: 1 });
      await seedEnrolment(classId, seated.id, 'approved', { decidedAt: new Date('2026-10-13T13:00:00.000Z') });

      const response = await requestSeat(student.accessToken, classId);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('pending');
    });

    it('refuses a full class while the waiting list is closed and accepts it again once it is on', async () => {
      const admin = await account('admin');
      const student = await account();
      const seated = await account('student', 'approved', 'Seated');
      const classId = await makeClass(admin.id, [admin.id], { capacity: 1 });
      await seedEnrolment(classId, seated.id, 'approved', { decidedAt: new Date('2026-10-13T13:00:00.000Z') });
      await prisma.schoolSettings.deleteMany();
      await prisma.schoolSettings.create({
        data: { id: '00000000-0000-4000-8000-000000000001', waitingListEnabled: false },
      });

      const closed = await requestSeat(student.accessToken, classId);

      expect([closed.status, closed.body.errors]).toEqual([409, ['enrolment.waitingList.closed']]);
      expect(await enrolmentsOf(classId)).toHaveLength(1);

      const free = await makeClass(admin.id, [admin.id], { capacity: 2 });
      expect((await requestSeat(student.accessToken, free)).status).toBe(201);

      await prisma.schoolSettings.updateMany({ data: { waitingListEnabled: true } });
      expect((await requestSeat(student.accessToken, classId)).status).toBe(201);
    });

    it('keeps a waiting request pending while the waiting list is closed and approves it once a seat frees', async () => {
      const admin = await account('admin');
      const waiting = await account('student', 'approved', 'Waiting');
      const seated = await account('student', 'approved', 'Seated');
      const classId = await makeClass(admin.id, [admin.id], { capacity: 1 });
      const seatedId = await seedEnrolment(classId, seated.id, 'approved', {
        decidedAt: new Date('2026-10-13T13:00:00.000Z'),
      });
      const waitingId = (await requestSeat(waiting.accessToken, classId)).body.id;
      await prisma.schoolSettings.deleteMany();
      await prisma.schoolSettings.create({
        data: { id: '00000000-0000-4000-8000-000000000001', waitingListEnabled: false },
      });
      await prisma.enrolment.update({ where: { id: seatedId }, data: { status: 'withdrawn' } });

      expect((await enrolmentsOf(classId)).find((enrolment) => enrolment.id === waitingId)?.status).toBe('pending');

      const approved = await as(admin.accessToken, http().post(`/enrolments/${waitingId}/approve`));

      expect([approved.status, approved.body.status]).toEqual([200, 'approved']);
    });

    it.each([[undefined], [{}], [{ acceptCancellationRule: false }]])(
      'accepts a discipline with no rule with the body %j and stores no acceptance',
      async (body) => {
        const admin = await account('admin');
        const student = await account();
        const classId = await makeClass(admin.id, [admin.id], { discipline: 'skate' });

        const response = await as(student.accessToken, http().post(`/classes/${classId}/enrolments`)).send(body);

        expect(response.status).toBe(201);
        expect((await enrolmentsOf(classId))[0]!.ruleAcceptedAt).toBeNull();
      },
    );
  });

  describe('refuses', () => {
    it('answers each refusal in order and stores nothing', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      const classId = await makeClass(admin.id, [instructor.id]);
      const cancelled = await makeClass(admin.id, [instructor.id], { cancelledAt: new Date('2026-10-13T10:00:00.000Z') });
      const missing = randomUUID();

      for (const status of NOT_APPROVED) {
        const other = await account('student', status);
        const response = await requestSeat(other.accessToken, classId);
        expect([response.status, response.body.errors]).toEqual([403, ['user.status.notApproved']]);
      }
      for (const person of [instructor, admin]) {
        const response = await requestSeat(person.accessToken, classId);
        expect([response.status, response.body.errors]).toEqual([403, ['enrolment.role.notStudent']]);
      }
      for (const id of ['not-a-uuid', missing]) {
        const response = await requestSeat(student.accessToken, id);
        expect([response.status, response.body.errors]).toEqual([404, ['class.notFound']]);
      }
      const cancelledResponse = await requestSeat(student.accessToken, cancelled);
      expect([cancelledResponse.status, cancelledResponse.body.errors]).toEqual([409, ['class.cancelled']]);
      for (const body of [{}, { acceptCancellationRule: false }, { acceptCancellationRule: 'true' }]) {
        const response = await requestSeat(student.accessToken, classId, body);
        expect([response.status, response.body.errors]).toEqual([422, ['enrolment.rule.notAccepted']]);
      }
      expect((await requestSeat(undefined, classId)).status).toBe(401);

      expect(await prisma.enrolment.count({ where: { classId: { in: [classId, cancelled] } } })).toBe(0);
      expect(await prisma.notification.count({ where: { type: 'enrolment.requested', userId: { in: [admin.id, instructor.id] } } })).toBe(0);
      expect(push.sent).toHaveLength(0);
    });

    it('refuses a class that started or finished, counting from its start instant exactly', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);

      now = new Date(new Date(STARTS_AT).getTime() - 1);
      expect((await requestSeat(student.accessToken, classId)).status).toBe(201);
      await prisma.enrolment.deleteMany({ where: { classId } });

      now = new Date(STARTS_AT);
      const atStart = await requestSeat(student.accessToken, classId);
      expect([atStart.status, atStart.body.errors]).toEqual([409, ['class.started']]);

      now = new Date(ENDS_AT);
      const finished = await requestSeat(student.accessToken, classId);
      expect([finished.status, finished.body.errors]).toEqual([409, ['class.started']]);
      expect(await prisma.enrolment.count({ where: { classId } })).toBe(0);
    });

    it('refuses a second open request, pending or approved', async () => {
      const admin = await account('admin');
      const student = await account();
      const approved = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      await seedEnrolment(classId, approved.id, 'approved');

      expect((await requestSeat(student.accessToken, classId)).status).toBe(201);
      const again = await requestSeat(student.accessToken, classId);
      const alreadySeated = await requestSeat(approved.accessToken, classId);

      expect([again.status, again.body.errors]).toEqual([409, ['enrolment.alreadyOpen']]);
      expect([alreadySeated.status, alreadySeated.body.errors]).toEqual([409, ['enrolment.alreadyOpen']]);
      expect(await prisma.enrolment.count({ where: { classId } })).toBe(2);
    });
  });

  describe('requests again', () => {
    it('creates a new pending enrolment after an earlier request ended, keeping the earlier one', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      const withdrawn = await seedEnrolment(classId, student.id, 'withdrawn', {
        requestedAt: new Date('2026-10-12T12:00:00.000Z'),
      });
      const expired = await seedEnrolment(classId, student.id, 'expired', {
        requestedAt: new Date('2026-10-13T12:00:00.000Z'),
      });

      const response = await requestSeat(student.accessToken, classId);

      expect(response.status).toBe(201);
      const rows = await enrolmentsOf(classId);
      expect(rows.map((row) => [row.id, row.status])).toEqual([
        [withdrawn, 'withdrawn'],
        [expired, 'expired'],
        [response.body.id, 'pending'],
      ]);
    });

    it('leaves exactly one pending enrolment for two simultaneous requests', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);

      const [first, second] = await Promise.all([
        requestSeat(student.accessToken, classId),
        requestSeat(student.accessToken, classId),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['enrolment.alreadyOpen']);
      expect(await enrolmentsOf(classId)).toHaveLength(1);
      expect(
        await notificationsOf(admin.id, 'enrolment.requested'),
      ).toHaveLength(1);
    });
  });

  describe('withdraws', () => {
    it('ends a pending request and notifies nobody', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      const created = await requestSeat(student.accessToken, classId);
      const before = await prisma.notification.count();
      push.sent = [];

      const response = await withdraw(student.accessToken, created.body.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: created.body.id,
        classId,
        status: 'withdrawn',
        requestedAt: NOW.toISOString(),
      });
      expect(await prisma.enrolment.findUniqueOrThrow({ where: { id: created.body.id } })).toMatchObject({
        status: 'withdrawn',
        endedAt: NOW,
      });
      expect(await prisma.notification.count()).toBe(before);
      expect(push.sent).toHaveLength(0);
    });

    it('refuses what it cannot withdraw', async () => {
      const admin = await account('admin');
      const student = await account();
      const stranger = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      const created = await requestSeat(student.accessToken, classId);
      const id = created.body.id as string;

      for (const bad of ['not-a-uuid', randomUUID()]) {
        const response = await withdraw(student.accessToken, bad);
        expect([response.status, response.body.errors]).toEqual([404, ['enrolment.notFound']]);
      }
      const others = await withdraw(stranger.accessToken, id);
      expect([others.status, others.body.errors]).toEqual([404, ['enrolment.notFound']]);
      const pendingAccount = await account('student', 'pending');
      expect((await withdraw(pendingAccount.accessToken, id)).body.errors).toEqual(['user.status.notApproved']);
      expect((await withdraw(undefined, id)).status).toBe(401);

      now = new Date(STARTS_AT);
      const started = await withdraw(student.accessToken, id);
      expect([started.status, started.body.errors]).toEqual([409, ['class.started']]);
      now = NOW;

      expect((await withdraw(student.accessToken, id)).status).toBe(200);
      const again = await withdraw(student.accessToken, id);
      expect([again.status, again.body.errors]).toEqual([409, ['enrolment.notPending']]);
    });

    it('lets exactly one of two simultaneous withdraws win', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      const created = await requestSeat(student.accessToken, classId);

      const [first, second] = await Promise.all([
        withdraw(student.accessToken, created.body.id),
        withdraw(student.accessToken, created.body.id),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['enrolment.notPending']);
    });
  });

  describe('expires', () => {
    it('expires the pending requests of a class that started and tells their students once', async () => {
      const admin = await account('admin');
      const first = await account('student', 'approved', 'Ana Souza');
      const second = await account();
      const approved = await account();
      await withPhone(first.id, 'pt-BR');
      await withPhone(second.id, 'en');
      const classId = await makeClass(admin.id, [admin.id]);
      const future = await makeClass(admin.id, [admin.id], {
        startsAt: '2026-10-16T11:00:00.000Z',
        endsAt: '2026-10-16T12:00:00.000Z',
      });
      const cancelled = await makeClass(admin.id, [admin.id], { cancelledAt: new Date('2026-10-13T10:00:00.000Z') });
      const a = await seedEnrolment(classId, first.id, 'pending');
      const b = await seedEnrolment(classId, second.id, 'pending');
      const kept = await seedEnrolment(classId, approved.id, 'approved');
      const notYet = await seedEnrolment(future, first.id, 'pending');
      const ofCancelled = await seedEnrolment(cancelled, first.id, 'pending');
      now = new Date('2026-10-15T11:05:00.000Z');
      const job = app.get(EnrolmentExpiryJob);

      expect(await job.run()).toEqual({ expired: 2 });

      const status = async (id: string) => (await prisma.enrolment.findUniqueOrThrow({ where: { id } })).status;
      expect([await status(a), await status(b), await status(kept)]).toEqual(['expired', 'expired', 'approved']);
      expect([await status(notYet), await status(ofCancelled)]).toEqual(['pending', 'pending']);
      const [notification] = await notificationsOf(first.id, 'enrolment.expired');
      expect(notification!.params).toEqual({ classId, discipline: 'surf', startsAt: STARTS_AT });
      expect(await notificationsOf(second.id, 'enrolment.expired')).toHaveLength(1);
      expect(push.sent).toHaveLength(2);
      const pt = push.sent.find((message) => message.locale === 'pt-BR')!;
      expect(renderPush('enrolment.expired', pt.params, 'pt-BR')).toEqual({
        title: 'Você não conseguiu vaga',
        body: 'A aula de Surf de 15/10 às 08:00 começou sem vaga para o seu pedido.',
      });

      push.sent = [];
      expect(await job.run()).toEqual({ expired: 0 });
      expect(push.sent).toHaveLength(0);
      expect(await notificationsOf(first.id, 'enrolment.expired')).toHaveLength(1);
    });

    it('keeps the requests expired when the push provider fails', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(student.id);
      const classId = await makeClass(admin.id, [admin.id]);
      const id = await seedEnrolment(classId, student.id, 'pending');
      now = new Date('2026-10-15T11:05:00.000Z');
      push.failing = true;

      expect(await app.get(EnrolmentExpiryJob).run()).toEqual({ expired: 1 });

      expect((await prisma.enrolment.findUniqueOrThrow({ where: { id } })).status).toBe('expired');
    });
  });

  describe('notifies', () => {
    it('tells the approved admins and the class instructors once each', async () => {
      const student = await account('student', 'approved', 'Ana Souza');
      const adminOne = await account('admin');
      const adminTwo = await account('admin');
      const teachingAdmin = await account('admin');
      const pendingAdmin = await account('admin', 'pending');
      const removedAdmin = await account('admin', 'removed');
      const instructor = await account('instructor');
      const otherInstructor = await account('instructor');
      for (const person of [adminOne, adminTwo, teachingAdmin, pendingAdmin, removedAdmin, instructor, otherInstructor]) {
        await withPhone(person.id, 'pt-BR');
      }
      const classId = await makeClass(adminOne.id, [instructor.id, teachingAdmin.id]);

      const response = await requestSeat(student.accessToken, classId);

      expect(response.status).toBe(201);
      const count = async (userId: string) => (await notificationsOf(userId, 'enrolment.requested')).length;
      expect(await Promise.all([adminOne, adminTwo, teachingAdmin, instructor].map((person) => count(person.id)))).toEqual([1, 1, 1, 1]);
      expect(await Promise.all([pendingAdmin, removedAdmin, otherInstructor, student].map((person) => count(person.id)))).toEqual([0, 0, 0, 0]);
      const [stored] = await notificationsOf(instructor.id, 'enrolment.requested');
      expect(stored!.params).toEqual({
        classId,
        studentName: 'Ana Souza',
        discipline: 'surf',
        startsAt: STARTS_AT,
      });
      const mine = push.sent.filter((message) => message.type === 'enrolment.requested');
      // Every approved admin (also the ones other suites left in the database) and the instructor.
      expect(mine.length).toBeGreaterThanOrEqual(4);
      expect(renderPush('enrolment.requested', mine[0]!.params, 'pt-BR')).toEqual({
        title: 'Novo pedido de vaga',
        body: 'Ana Souza pediu vaga na aula de Surf de 15/10 às 08:00.',
      });
    });

    it('keeps the 201 when the push provider fails', async () => {
      const admin = await account('admin');
      const student = await account();
      await withPhone(admin.id);
      const classId = await makeClass(admin.id, [admin.id]);
      push.failing = true;

      const response = await requestSeat(student.accessToken, classId);

      expect(response.status).toBe(201);
      expect(await enrolmentsOf(classId)).toHaveLength(1);
    });
  });

  describe('counts', () => {
    it('counts the seats and lists the students from the approved enrolments, in approval order', async () => {
      const admin = await account('admin');
      const viewer = await account();
      const ana = await account('student', 'approved', 'Ana');
      const bia = await account('student', 'approved', 'Bia');
      const others = [await account(), await account(), await account()];
      const classId = await makeClass(admin.id, [admin.id]);
      await seedEnrolment(classId, bia.id, 'approved', { decidedAt: new Date('2026-10-13T10:00:00.000Z') });
      await seedEnrolment(classId, ana.id, 'approved', { decidedAt: new Date('2026-10-13T11:00:00.000Z') });
      for (const other of others) {
        await seedEnrolment(classId, other.id, 'pending');
      }
      const gone = await account();
      await seedEnrolment(classId, gone.id, 'withdrawn');
      await seedEnrolment(classId, gone.id, 'expired');
      await seedEnrolment(classId, gone.id, 'classCancelled');

      const one = await as(viewer.accessToken, http().get(`/classes/${classId}`));
      const week = await as(viewer.accessToken, http().get('/classes?date=2026-10-15'));

      expect(one.body.seatsTaken).toBe(2);
      expect((one.body.students as { name: string }[]).map((student) => student.name)).toEqual(['Bia', 'Ana']);
      const item = (week.body.items as { id: string; seatsTaken: number }[]).find((entry) => entry.id === classId);
      expect(item!.seatsTaken).toBe(2);
    });

    it('keeps the week list at 4 students while the seats taken are never capped', async () => {
      const admin = await account('admin');
      const viewer = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      for (let index = 0; index < 6; index += 1) {
        const student = await account('student', 'approved', `Aluno ${index}`);
        await seedEnrolment(classId, student.id, 'approved', {
          decidedAt: new Date(`2026-10-13T1${index}:00:00.000Z`),
        });
      }

      const week = await as(viewer.accessToken, http().get('/classes?date=2026-10-15'));
      const one = await as(viewer.accessToken, http().get(`/classes/${classId}`));

      const item = (week.body.items as { id: string; seatsTaken: number; students: unknown[] }[]).find(
        (entry) => entry.id === classId,
      )!;
      expect([item.seatsTaken, item.students.length]).toEqual([6, 4]);
      expect([one.body.seatsTaken, one.body.students.length]).toEqual([6, 6]);
    });

    it('refuses deleting a class with a pending request and a capacity below the approved count', async () => {
      const admin = await account('admin');
      const first = await account();
      const second = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      await seedEnrolment(classId, first.id, 'approved', { decidedAt: new Date('2026-10-13T10:00:00.000Z') });
      await seedEnrolment(classId, second.id, 'pending');

      const deleted = await as(admin.accessToken, http().delete(`/classes/${classId}`));
      expect(deleted.status).toBe(409);
      expect(deleted.body.errors).toEqual(['class.delete.notEmpty']);
      expect(deleted.body.details).toEqual({ seatsTaken: 1, pendingRequests: 1 });

      const edit = await as(admin.accessToken, http().put(`/classes/${classId}`)).send({
        discipline: 'surf',
        level: 'beginner',
        date: '2026-10-15',
        start: '08:00',
        end: '09:00',
        locationId,
        instructorIds: [admin.id],
        capacity: 0,
      });
      expect(edit.status).toBe(422);
    });

    it('lets an admin delete a class whose requests all ended', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      await seedEnrolment(classId, student.id, 'withdrawn');

      expect((await as(admin.accessToken, http().delete(`/classes/${classId}`))).status).toBe(204);
    });
  });

  describe('myEnrolment', () => {
    it("carries the caller's latest enrolment on the week and on the class, and null elsewhere", async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      const classId = await makeClass(admin.id, [instructor.id]);
      const other = await makeClass(admin.id, [instructor.id], {
        startsAt: '2026-10-16T11:00:00.000Z',
        endsAt: '2026-10-16T12:00:00.000Z',
      });
      await seedEnrolment(classId, student.id, 'expired', { requestedAt: new Date('2026-10-12T12:00:00.000Z') });
      const latest = await seedEnrolment(classId, student.id, 'pending', {
        requestedAt: new Date('2026-10-13T12:00:00.000Z'),
      });

      const one = await as(student.accessToken, http().get(`/classes/${classId}`));
      const week = await as(student.accessToken, http().get('/classes?date=2026-10-15'));

      const expected = { id: latest, status: 'pending', requestedAt: '2026-10-13T12:00:00.000Z', reason: null };
      expect(one.body.myEnrolment).toEqual(expected);
      const byId = Object.fromEntries(
        (week.body.items as { id: string; myEnrolment: unknown }[]).map((item) => [item.id, item.myEnrolment]),
      );
      expect(byId[classId]).toEqual(expected);
      expect(byId[other]).toBeNull();
    });

    it('breaks a tie on the request time by the greater id', async () => {
      const admin = await account('admin');
      const student = await account();
      const classId = await makeClass(admin.id, [admin.id]);
      const requestedAt = new Date('2026-10-13T12:00:00.000Z');
      const ids = [
        await seedEnrolment(classId, student.id, 'withdrawn', { requestedAt }),
        await seedEnrolment(classId, student.id, 'expired', { requestedAt }),
      ];

      const one = await as(student.accessToken, http().get(`/classes/${classId}`));

      expect(one.body.myEnrolment.id).toBe([...ids].sort().at(-1));
    });

    it('reads null for an instructor and an admin, also on the answers of edit and cancel', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const student = await account();
      const classId = await makeClass(admin.id, [instructor.id]);
      await seedEnrolment(classId, student.id, 'pending');

      const asInstructor = await as(instructor.accessToken, http().get(`/classes/${classId}`));
      const asAdmin = await as(admin.accessToken, http().get(`/classes/${classId}`));
      const cancelled = await as(admin.accessToken, http().post(`/classes/${classId}/cancel`)).send({});

      expect(asInstructor.body.myEnrolment).toBeNull();
      expect(asAdmin.body.myEnrolment).toBeNull();
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.myEnrolment).toBeNull();

      const edited = await makeClass(admin.id, [instructor.id]);
      const edit = await as(admin.accessToken, http().put(`/classes/${edited}`)).send({
        discipline: 'surf',
        level: 'beginner',
        date: '2026-10-15',
        start: '08:00',
        end: '09:00',
        locationId,
        instructorIds: [instructor.id],
        capacity: 8,
      });
      expect(edit.status).toBe(200);
      expect(edit.body.myEnrolment).toBeNull();
    });
  });
});
