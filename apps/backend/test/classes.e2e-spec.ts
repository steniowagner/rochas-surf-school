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
import { SystemClockProvider } from '../src/modules/classes/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'classes.e2e.example.com';
const MARK = 'e2eclass';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

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

describe('Classes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let now: Date;
  let locationId: string;

  beforeEach(async () => {
    push = new FakePushProvider();
    now = NOW;
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(SystemClockProvider)
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
  });

  afterEach(async () => {
    // Classes go first (their location and creator are restricted); instructors cascade with the users.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  async function account(role: Role = 'admin', status: Status = 'approved'): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status,
      },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  const batch = (token: string | undefined, body: Record<string, unknown>) =>
    as(token, http().post('/classes/batch')).send(body);

  const suggestions = (token: string | undefined) => as(token, http().get('/classes/time-range-suggestions'));

  function validBody(instructorIds: string[], overrides: Record<string, unknown> = {}) {
    return {
      discipline: 'surf',
      level: 'beginner',
      startDate: '2026-10-15',
      endDate: '2026-10-17',
      weekdays: [3, 4, 5],
      timeRanges: [
        { start: '08:00', end: '09:00' },
        { start: '16:00', end: '17:00' },
      ],
      locationId,
      instructorIds,
      capacity: 8,
      notes: '  Bring sunscreen  ',
      ...overrides,
    };
  }

  const countClasses = (creatorId: string) => prisma.schoolClass.count({ where: { createdBy: creatorId } });

  async function storedClasses(creatorId: string) {
    return prisma.schoolClass.findMany({
      where: { createdBy: creatorId },
      include: { instructors: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async function seedClass(creatorId: string, startsAt: string, endsAt: string) {
    await prisma.schoolClass.create({
      data: {
        id: randomUUID(),
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        locationId,
        capacity: 8,
        createdBy: creatorId,
      },
    });
  }

  it('creates one class per day and time range', async () => {
    const admin = await account();
    const instructor = await account('instructor');

    const response = await batch(admin.accessToken, validBody([instructor.id]));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ count: 4 });
    const classes = await storedClasses(admin.id);
    expect(classes.map((item) => [item.startsAt.toISOString(), item.endsAt.toISOString()])).toEqual([
      ['2026-10-15T11:00:00.000Z', '2026-10-15T12:00:00.000Z'],
      ['2026-10-15T19:00:00.000Z', '2026-10-15T20:00:00.000Z'],
      ['2026-10-16T11:00:00.000Z', '2026-10-16T12:00:00.000Z'],
      ['2026-10-16T19:00:00.000Z', '2026-10-16T20:00:00.000Z'],
    ]);
    for (const item of classes) {
      expect(item).toMatchObject({
        discipline: 'surf',
        level: 'beginner',
        locationId,
        capacity: 8,
        notes: 'Bring sunscreen',
      });
      expect(item.instructors.map((link) => link.userId)).toEqual([instructor.id]);
    }
  });

  it('creates one class per time range for a one-day batch, one assignment per repeated instructor and none for blank notes', async () => {
    const admin = await account();
    const instructor = await account('instructor');

    const response = await batch(
      admin.accessToken,
      validBody([instructor.id, instructor.id], {
        startDate: '2026-10-20',
        endDate: '2026-10-20',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        notes: '   ',
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ count: 2 });
    const classes = await storedClasses(admin.id);
    expect(classes).toHaveLength(2);
    expect(classes.every((item) => item.notes === null && item.instructors.length === 1)).toBe(true);
  });

  it('creates classes that overlap those of an earlier batch', async () => {
    const admin = await account();
    const instructor = await account('instructor');
    const body = validBody([instructor.id]);

    await batch(admin.accessToken, body);
    const second = await batch(admin.accessToken, body);

    expect(second.status).toBe(201);
    expect(await countClasses(admin.id)).toBe(8);
  });

  it('lets an admin teach the batch', async () => {
    const admin = await account();

    const response = await batch(admin.accessToken, validBody([admin.id]));

    expect(response.status).toBe(201);
  });

  describe('refuses', () => {
    it('refuses an invalid batch with every key and stores nothing', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, {
        ...validBody([instructor.id]),
        discipline: 'tennis',
        timeRanges: [
          { start: '10:00', end: '09:00' },
          { start: '08:00', end: '09:00' },
          { start: '08:30', end: '09:30' },
        ],
        capacity: 21,
        notes: 'n'.repeat(301),
        instructorIds: [],
      });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual([
        'class.discipline.invalid',
        'class.timeRanges.endBeforeStart',
        'class.timeRanges.overlap',
        'class.capacity.invalid',
        'class.notes.max.length',
        'class.instructors.required',
      ]);
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('refuses an empty body', async () => {
      const admin = await account();

      const response = await as(admin.accessToken, http().post('/classes/batch'));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'class.discipline.invalid',
          'class.level.invalid',
          'class.dates.invalid',
          'class.weekdays.invalid',
          'class.timeRanges.required',
          'class.capacity.invalid',
          'class.instructors.required',
          'class.location.required',
        ]),
      );
    });

    it('accepts ranges that only touch and refuses two that overlap', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const touching = [
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
      ];

      const ok = await batch(admin.accessToken, validBody([instructor.id], { timeRanges: touching }));
      const bad = await batch(
        admin.accessToken,
        validBody([instructor.id], {
          timeRanges: [touching[0], { start: '08:30', end: '09:30' }],
        }),
      );

      expect(ok.status).toBe(201);
      expect(bad.status).toBe(422);
      expect(bad.body.errors).toEqual(['class.timeRanges.overlap']);
    });

    it('refuses an unknown location', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(
        admin.accessToken,
        validBody([instructor.id], { locationId: randomUUID() }),
      );

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.location.notFound']);
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('refuses a student, a pending instructor and an unknown user as instructors', async () => {
      const admin = await account();
      const student = await account('student');
      const pending = await account('instructor', 'pending');

      for (const id of [student.id, pending.id, randomUUID()]) {
        const response = await batch(admin.accessToken, validBody([id]));

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['class.instructors.invalid']);
      }
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('refuses weekdays that exclude every date', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, validBody([instructor.id], { weekdays: [7] }));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.batch.empty']);
    });

    it('refuses 201 classes with the limit in the details, and accepts 200', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const days = (count: number) => {
        const end = new Date(Date.UTC(2026, 9, 15 + count - 1));
        return end.toISOString().slice(0, 10);
      };
      const body = (count: number) =>
        validBody([instructor.id], {
          startDate: '2026-10-15',
          endDate: days(count),
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [{ start: '08:00', end: '09:00' }],
        });

      const tooMany = await batch(admin.accessToken, body(201));

      expect(tooMany.status).toBe(422);
      expect(tooMany.body.errors).toEqual(['class.batch.tooLarge']);
      expect(tooMany.body.details).toEqual({ max: 200 });
      expect(await countClasses(admin.id)).toBe(0);

      const exact = await batch(admin.accessToken, body(200));

      expect(exact.status).toBe(201);
      expect(exact.body).toEqual({ count: 200 });
    });
  });

  describe('past', () => {
    const pastBody = (instructorId: string, start = '2026-10-14') =>
      validBody([instructorId], {
        startDate: start,
        endDate: '2026-10-16',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
      });

    it('refuses the whole batch when one class has already started', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, pastBody(instructor.id));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.startsAt.past']);
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('creates the same batch starting tomorrow', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, pastBody(instructor.id, '2026-10-15'));

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ count: 4 });
    });

    it('refuses a class that starts exactly now and judges by the server clock', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const body = validBody([instructor.id], {
        startDate: '2026-10-14',
        endDate: '2026-10-14',
        weekdays: [3],
        timeRanges: [{ start: '10:00', end: '11:00' }],
      });

      const atNow = await batch(admin.accessToken, body);
      now = new Date('2026-10-14T12:59:59.000Z');
      const justBefore = await batch(admin.accessToken, body);

      expect(atNow.status).toBe(422);
      expect(atNow.body.errors).toEqual(['class.startsAt.past']);
      expect(justBefore.status).toBe(201);
    });
  });

  describe('suggestions', () => {
    it('lists the distinct time ranges of last week, sorted', async () => {
      const admin = await account();
      await seedClass(admin.id, '2026-10-10T19:00:00.000Z', '2026-10-10T20:00:00.000Z');
      await seedClass(admin.id, '2026-10-06T11:00:00.000Z', '2026-10-06T12:00:00.000Z');
      await seedClass(admin.id, '2026-10-08T11:00:00.000Z', '2026-10-08T12:00:00.000Z');

      const response = await suggestions(admin.accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [
          { start: '08:00', end: '09:00' },
          { start: '16:00', end: '17:00' },
        ],
      });
    });

    it('ignores this week and two weeks ago, and counts Sunday night', async () => {
      const admin = await account();
      await seedClass(admin.id, '2026-10-12T03:00:00.000Z', '2026-10-12T04:00:00.000Z');
      await seedClass(admin.id, '2026-09-29T11:00:00.000Z', '2026-09-29T12:00:00.000Z');
      await seedClass(admin.id, '2026-10-12T02:00:00.000Z', '2026-10-12T02:30:00.000Z');

      const response = await suggestions(admin.accessToken);

      expect(response.body).toEqual({ items: [{ start: '23:00', end: '23:30' }] });
    });

    it('is empty when nothing happened last week', async () => {
      const admin = await account();
      await seedClass(admin.id, '2026-10-14T11:00:00.000Z', '2026-10-14T12:00:00.000Z');

      const response = await suggestions(admin.accessToken);

      expect(response.body).toEqual({ items: [] });
    });
  });

  describe('access', () => {
    it('answers 401 without a token', async () => {
      const [write, read] = await Promise.all([batch(undefined, {}), suggestions(undefined)]);

      expect(write.status).toBe(401);
      expect(write.body.errors).toEqual(['auth.token.invalid']);
      expect(read.status).toBe(401);
      expect(read.body.errors).toEqual(['auth.token.invalid']);
    });

    it.each(NOT_APPROVED)('refuses an admin account that is %s, first', async (status) => {
      const token = (await account('admin', status)).accessToken;

      const write = await batch(token, {});
      const read = await suggestions(token);

      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.status.notApproved']);
      expect(read.status).toBe(403);
      expect(read.body.errors).toEqual(['user.status.notApproved']);
    });

    it.each(['student', 'instructor'] as const)('refuses an approved %s and stores nothing', async (role) => {
      const admin = await account();
      const instructor = await account('instructor');
      const caller = await account(role);

      const write = await batch(caller.accessToken, validBody([instructor.id]));
      const read = await suggestions(caller.accessToken);

      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.role.notAdmin']);
      expect(read.status).toBe(403);
      expect(read.body.errors).toEqual(['user.role.notAdmin']);
      expect(await countClasses(caller.id)).toBe(0);
      expect(await countClasses(admin.id)).toBe(0);
    });
  });

  describe('notifies', () => {
    async function withPhone(userId: string, locale = 'pt-BR') {
      await prisma.pushToken.create({
        data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
      });
    }

    const notificationsOf = (userId: string) =>
      prisma.notification.findMany({ where: { userId, type: 'class.assigned' } });

    it('stores and pushes one notification per instructor for the batch, and none for the creator', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      await withPhone(instructor.id, 'pt-BR');
      await withPhone(admin.id);

      const response = await batch(admin.accessToken, validBody([instructor.id, admin.id]));

      expect(response.status).toBe(201);
      const stored = await notificationsOf(instructor.id);
      expect(stored).toHaveLength(1);
      expect(stored[0]!.params).toEqual({ count: 4, discipline: 'surf' });
      expect(await notificationsOf(admin.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(1);
      expect(push.sent[0]).toMatchObject({
        type: 'class.assigned',
        params: { count: 4, discipline: 'surf' },
        locale: 'pt-BR',
      });
      expect(renderPush('class.assigned', push.sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Novas aulas na sua escala',
        body: 'Você foi escalado para 4 aulas de Surf.',
      });
    });

    it('stores only the notification for an instructor without phones', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, validBody([instructor.id]));

      expect(response.status).toBe(201);
      expect(await notificationsOf(instructor.id)).toHaveLength(1);
      expect(push.sent).toHaveLength(0);
    });

    it('keeps the 201 and the classes when the push provider fails', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      await withPhone(instructor.id);
      push.failing = true;

      const response = await batch(admin.accessToken, validBody([instructor.id]));

      expect(response.status).toBe(201);
      expect(await countClasses(admin.id)).toBe(4);
      expect(await notificationsOf(instructor.id)).toHaveLength(1);
    });

    it('notifies nobody when the batch is refused', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      await withPhone(instructor.id);

      const response = await batch(admin.accessToken, validBody([instructor.id], { capacity: 0 }));

      expect(response.status).toBe(422);
      expect(await notificationsOf(instructor.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(0);
    });
  });
});
