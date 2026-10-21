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

  it('creates no class on an excluded date, whatever its weekday', async () => {
    const admin = await account();
    const instructor = await account('instructor');

    const response = await batch(
      admin.accessToken,
      validBody([instructor.id], {
        startDate: '2026-10-20',
        endDate: '2026-10-22',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        excludedDates: ['2026-10-21'],
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ count: 4 });
    const classes = await storedClasses(admin.id);
    expect(classes.map((item) => item.startsAt.toISOString().slice(0, 10))).toEqual([
      '2026-10-20',
      '2026-10-20',
      '2026-10-22',
      '2026-10-22',
    ]);
  });

  it('refuses malformed excluded dates and a batch whose dates are all excluded', async () => {
    const admin = await account();
    const instructor = await account('instructor');

    const malformed = await batch(admin.accessToken, validBody([instructor.id], { excludedDates: ['16/10/2026'] }));
    const everyDate = await batch(
      admin.accessToken,
      validBody([instructor.id], { excludedDates: ['2026-10-15', '2026-10-16'] }),
    );

    expect(malformed.status).toBe(422);
    expect(malformed.body.errors).toEqual(['class.excludedDates.invalid']);
    expect(everyDate.status).toBe(422);
    expect(everyDate.body.errors).toEqual(['class.batch.empty']);
    expect(await countClasses(admin.id)).toBe(0);
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

    it('creates only the classes that have not started when asked to skip the past', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, { ...pastBody(instructor.id), skipPast: true });

      // 14 Oct has 08:00 (past, it is 10:00) and 16:00; the 15th and 16th have both: five classes.
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ count: 5 });
      expect(await countClasses(admin.id)).toBe(5);
    });

    it('refuses a malformed skipPast and an all-past batch even when skipping', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const malformed = await batch(admin.accessToken, { ...pastBody(instructor.id), skipPast: 'yes' });
      const allPast = await batch(admin.accessToken, {
        ...pastBody(instructor.id),
        endDate: '2026-10-14',
        timeRanges: [{ start: '08:00', end: '09:00' }],
        skipPast: true,
      });

      expect(malformed.status).toBe(422);
      expect(malformed.body.errors).toEqual(['class.skipPast.invalid']);
      expect(allPast.status).toBe(422);
      expect(allPast.body.errors).toEqual(['class.batch.empty']);
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('refuses more than 200 classes left after skipping a start date in the past', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      // Ten days before the server's today (14 Oct 2026) to eight months after it: ~259 classes left.
      const response = await batch(
        admin.accessToken,
        validBody([instructor.id], {
          startDate: '2026-10-04',
          endDate: '2027-06-14',
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [{ start: '16:00', end: '17:00' }],
          skipPast: true,
        }),
      );

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.batch.tooLarge']);
      expect(response.body.details).toEqual({ max: 200 });
      expect(await countClasses(admin.id)).toBe(0);
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

  describe('week', () => {
    const week = (token: string | undefined, query = '?date=2026-10-15') => as(token, http().get(`/classes${query}`));

    async function seedFull(creatorId: string, start: string, end: string, instructorIds: string[] = [], notes?: string) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date(start),
          endsAt: new Date(end),
          locationId,
          capacity: 8,
          notes,
          createdBy: creatorId,
          instructors: { create: instructorIds.map((userId) => ({ userId })) },
        },
      });
      return id;
    }

    // The database may hold other classes (review data): only this test's location counts.
    const mine = (items: { id: string; notes: string | null; instructors: unknown[]; location: { id: string } }[]) =>
      items.filter((item) => item.location.id === locationId);

    it('lists the classes of the week that holds the date, in Fortaleza time', async () => {
      const admin = await account();
      const bruno = await account('instructor');
      const ana = await account('instructor');
      await prisma.user.update({ where: { id: bruno.id }, data: { name: 'Bruno' } });
      await prisma.user.update({ where: { id: ana.id }, data: { name: 'ana' } });
      await seedFull(admin.id, '2026-10-12T02:59:00.000Z', '2026-10-12T03:30:00.000Z'); // Sunday 23:59
      const monday = await seedFull(admin.id, '2026-10-12T03:00:00.000Z', '2026-10-12T04:00:00.000Z');
      const early = await seedFull(
        admin.id,
        '2026-10-14T11:00:00.000Z',
        '2026-10-14T12:00:00.000Z',
        [bruno.id, ana.id],
        'Bring sunscreen',
      );
      const late = await seedFull(admin.id, '2026-10-14T19:00:00.000Z', '2026-10-14T20:00:00.000Z');
      const sunday = await seedFull(admin.id, '2026-10-19T02:00:00.000Z', '2026-10-19T02:30:00.000Z'); // Sunday 23:00
      await seedFull(admin.id, '2026-10-19T03:00:00.000Z', '2026-10-19T04:00:00.000Z'); // next Monday

      const response = await week(admin.accessToken);

      expect(response.status).toBe(200);
      expect(response.body.weekStart).toBe('2026-10-12');
      expect(mine(response.body.items).map((item) => item.id)).toEqual([monday, early, late, sunday]);
      const items = mine(response.body.items);
      expect(items[1]).toEqual({
        id: early,
        discipline: 'surf',
        level: 'beginner',
        startsAt: '2026-10-14T11:00:00.000Z',
        endsAt: '2026-10-14T12:00:00.000Z',
        capacity: 8,
        notes: 'Bring sunscreen',
        cancelledAt: null,
        cancellationMessage: null,
        cancellationDeadline: null,
        location: {
          id: locationId,
          name: expect.stringContaining(MARK),
          address: 'Av. Beira Mar',
          latitude: null,
          longitude: null,
        },
        instructors: [
          { id: ana.id, name: 'ana' },
          { id: bruno.id, name: 'Bruno' },
        ],
        seatsTaken: 0,
        students: [],
        guests: [],
        myEnrolment: null,
      });
      expect(items[0]!.notes).toBeNull();
      expect(items[0]!.instructors).toEqual([]);
      for (const date of ['2026-10-12', '2026-10-18']) {
        const same = await week(admin.accessToken, `?date=${date}`);
        expect(mine(same.body.items).map((item) => item.id)).toEqual([monday, early, late, sunday]);
      }
    });

    it('answers an empty week', async () => {
      const admin = await account();

      const response = await week(admin.accessToken, '?date=2031-03-05');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ weekStart: '2031-03-03', items: [] });
    });

    it('lets every approved role read the week', async () => {
      for (const role of ['student', 'instructor', 'admin'] as const) {
        const response = await week((await account(role)).accessToken);

        expect(response.status).toBe(200);
      }
    });

    it('refuses a missing, malformed or impossible date', async () => {
      const token = (await account('student')).accessToken;

      for (const query of ['', '?date=15/10/2026', '?date=2026-02-30']) {
        const response = await week(token, query);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['class.date.invalid']);
      }
    });
  });

  describe('class', () => {
    const one = (token: string | undefined, id: string) => as(token, http().get(`/classes/${id}`));

    it('answers the pendingRequests count to an admin and null to everyone else', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date('2026-10-14T19:00:00.000Z'),
          endsAt: new Date('2026-10-14T20:30:00.000Z'),
          locationId,
          capacity: 5,
          createdBy: admin.id,
          instructors: { create: [{ userId: instructor.id }] },
        },
      });
      const student = await account('student');
      for (const status of ['pending', 'pending', 'pending', 'approved'] as const) {
        await prisma.enrolment.create({
          data: { id: randomUUID(), classId: id, studentId: (await account('student')).id, status, requestedAt: NOW },
        });
      }

      const asAdmin = await one(admin.accessToken, id);
      const asInstructor = await one(instructor.accessToken, id);
      const asStudent = await one(student.accessToken, id);
      const week = await as(admin.accessToken, http().get('/classes?date=2026-10-14'));

      expect(asAdmin.body.pendingRequests).toBe(3);
      expect(asInstructor.body.pendingRequests).toBeNull();
      expect(asStudent.body.pendingRequests).toBeNull();
      expect(week.body.items[0]).not.toHaveProperty('pendingRequests');
    });

    it('answers one class with its location and instructors', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'skate',
          level: 'advanced',
          startsAt: new Date('2026-10-14T19:00:00.000Z'),
          endsAt: new Date('2026-10-14T20:30:00.000Z'),
          locationId,
          capacity: 5,
          createdBy: admin.id,
          instructors: { create: [{ userId: instructor.id }] },
        },
      });

      const response = await one((await account('student')).accessToken, id);
      const list = await as(admin.accessToken, http().get('/classes?date=2026-10-14'));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id,
        discipline: 'skate',
        level: 'advanced',
        capacity: 5,
        notes: null,
        location: { id: locationId, address: 'Av. Beira Mar' },
        instructors: [{ id: instructor.id, name: 'Person instructor' }],
        seatsTaken: 0,
        students: [],
      });
      expect(list.body.items.filter((item: { id: string }) => item.id === id)).toEqual([
        { ...response.body, pendingRequests: undefined },
      ]);
    });

    it('answers 404 for an unknown or malformed id', async () => {
      const token = (await account('student')).accessToken;

      for (const id of [randomUUID(), 'not-a-uuid']) {
        const response = await one(token, id);

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['class.notFound']);
      }
    });

    it('keeps the suggestions route: an admin gets them and a student a 403', async () => {
      const ok = await suggestions((await account('admin')).accessToken);
      const refused = await suggestions((await account('student')).accessToken);

      expect(ok.status).toBe(200);
      expect(ok.body).toEqual({ items: [] });
      expect(refused.status).toBe(403);
      expect(refused.body.errors).toEqual(['user.role.notAdmin']);
    });
  });

  describe('archived location', () => {
    async function archivedLocation() {
      return (
        await prisma.location.create({
          data: {
            id: randomUUID(),
            name: `${MARK} ${randomUUID().slice(0, 8)}`,
            nameKey: null,
            address: 'Av. Removida',
            archivedAt: new Date('2026-10-01T10:00:00.000Z'),
          },
        })
      ).id;
    }

    async function makeClassAt(creatorId: string, instructorId: string, atLocationId: string) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date('2026-10-15T11:00:00.000Z'),
          endsAt: new Date('2026-10-15T12:00:00.000Z'),
          locationId: atLocationId,
          capacity: 8,
          notes: 'Bring a hat',
          createdBy: creatorId,
          instructors: { create: [{ userId: instructorId }] },
        },
      });
      return id;
    }

    const sameBody = (instructorId: string, atLocationId: string, overrides: Record<string, unknown> = {}) => ({
      discipline: 'surf',
      level: 'beginner',
      date: '2026-10-15',
      start: '08:00',
      end: '09:00',
      locationId: atLocationId,
      instructorIds: [instructorId],
      capacity: 8,
      notes: 'Bring a hat',
      ...overrides,
    });

    it('refuses to create classes at an archived location and stores nothing', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const archived = await archivedLocation();

      const response = await batch(admin.accessToken, validBody([instructor.id], { locationId: archived }));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.location.archived']);
      expect(await countClasses(admin.id)).toBe(0);
    });

    it('answers class.location.notFound, not archived, for an unknown location', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      const response = await batch(admin.accessToken, validBody([instructor.id], { locationId: randomUUID() }));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.location.notFound']);
    });

    it('refuses to move a class to an archived location, but keeps one that was archived later', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const archived = await archivedLocation();
      const moving = await makeClassAt(admin.id, instructor.id, locationId);
      const staying = await makeClassAt(admin.id, instructor.id, archived);

      const refused = await as(admin.accessToken, http().put(`/classes/${moving}`)).send(
        sameBody(instructor.id, archived),
      );
      const kept = await as(admin.accessToken, http().put(`/classes/${staying}`)).send(
        sameBody(instructor.id, archived, { notes: 'New notes' }),
      );

      expect(refused.status).toBe(422);
      expect(refused.body.errors).toEqual(['class.location.archived']);
      expect((await prisma.schoolClass.findUnique({ where: { id: moving } }))!.locationId).toBe(locationId);
      expect(kept.status).toBe(200);
      expect(await prisma.schoolClass.findUnique({ where: { id: staying } })).toMatchObject({
        locationId: archived,
        notes: 'New notes',
      });
    });
  });

  describe('location point', () => {
    async function makeClassAt(creatorId: string, atLocationId: string) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date('2026-10-15T11:00:00.000Z'),
          endsAt: new Date('2026-10-15T12:00:00.000Z'),
          locationId: atLocationId,
          capacity: 8,
          createdBy: creatorId,
        },
      });
      return id;
    }

    async function placeWith(data: { latitude?: number; longitude?: number; archivedAt?: Date }) {
      return (
        await prisma.location.create({
          data: {
            id: randomUUID(),
            name: `${MARK} ${randomUUID().slice(0, 8)}`,
            nameKey: data.archivedAt ? null : `${MARK} ${randomUUID()}`,
            address: 'Av. Beira Mar',
            ...data,
          },
        })
      ).id;
    }

    it('carries the point of the location in one class and in the week', async () => {
      const admin = await account();
      const student = await account('student');
      const withPoint = await placeWith({ latitude: -3.7442, longitude: -38.4617 });
      const id = await makeClassAt(admin.id, withPoint);

      const one = await as(student.accessToken, http().get(`/classes/${id}`));
      const week = await as(student.accessToken, http().get('/classes?date=2026-10-15'));

      expect(one.status).toBe(200);
      expect(one.body.location).toEqual({
        id: withPoint,
        name: expect.any(String),
        address: 'Av. Beira Mar',
        latitude: -3.7442,
        longitude: -38.4617,
      });
      expect(week.body.items.find((item: { id: string }) => item.id === id).location).toEqual(one.body.location);
    });

    it('answers a null point for a location that has none', async () => {
      const admin = await account();
      const id = await makeClassAt(admin.id, locationId);

      const one = await as(admin.accessToken, http().get(`/classes/${id}`));

      expect(one.body.location).toMatchObject({ id: locationId, latitude: null, longitude: null });
    });

    it('reads an archived location the same way', async () => {
      const admin = await account();
      const archived = await placeWith({
        latitude: -3.8,
        longitude: -38.6,
        archivedAt: new Date('2026-10-01T10:00:00.000Z'),
      });
      const id = await makeClassAt(admin.id, archived);

      const one = await as(admin.accessToken, http().get(`/classes/${id}`));

      expect(one.body.location).toMatchObject({ id: archived, latitude: -3.8, longitude: -38.6 });
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

    it('refuses a pending account the week and the class, before checking the date', async () => {
      for (const role of ['student', 'instructor', 'admin'] as const) {
        const token = (await account(role, 'pending')).accessToken;

        const list = await as(token, http().get('/classes?date=nope'));
        const one = await as(token, http().get(`/classes/${randomUUID()}`));

        expect(list.status).toBe(403);
        expect(list.body.errors).toEqual(['user.status.notApproved']);
        expect(one.status).toBe(403);
        expect(one.body.errors).toEqual(['user.status.notApproved']);
      }
    });

    it('answers 401 without a token on the week and the class', async () => {
      const list = await http().get('/classes?date=2026-10-15');
      const one = await http().get(`/classes/${randomUUID()}`);

      expect(list.status).toBe(401);
      expect(list.body.errors).toEqual(['auth.token.invalid']);
      expect(one.status).toBe(401);
      expect(one.body.errors).toEqual(['auth.token.invalid']);
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

  describe('PUT /classes/:id', () => {
    const edit = (token: string | undefined, id: string, body: Record<string, unknown>) =>
      as(token, http().put(`/classes/${id}`)).send(body);

    async function withPhone(userId: string, locale = 'pt-BR') {
      await prisma.pushToken.create({
        data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
      });
    }

    // Tomorrow (2026-10-15) 08:00-09:00 in Fortaleza, unless the test moves it.
    async function makeClass(
      creatorId: string,
      instructorIds: string[],
      overrides: { startsAt?: string; endsAt?: string } = {},
    ) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date(overrides.startsAt ?? '2026-10-15T11:00:00.000Z'),
          endsAt: new Date(overrides.endsAt ?? '2026-10-15T12:00:00.000Z'),
          locationId,
          capacity: 8,
          notes: 'Bring a hat',
          createdBy: creatorId,
          instructors: { create: instructorIds.map((userId) => ({ userId })) },
        },
      });
      return id;
    }

    // The stored values as the body of a no-change save.
    const sameBody = (instructorIds: string[], overrides: Record<string, unknown> = {}) => ({
      discipline: 'surf',
      level: 'beginner',
      date: '2026-10-15',
      start: '08:00',
      end: '09:00',
      locationId,
      instructorIds,
      capacity: 8,
      notes: 'Bring a hat',
      ...overrides,
    });

    const stored = (id: string) =>
      prisma.schoolClass.findUniqueOrThrow({ where: { id }, include: { instructors: true } });

    it("edits a class that hasn't started", async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      const sibling = await makeClass(admin.id, [instructor.id], {
        startsAt: '2026-10-16T11:00:00.000Z',
        endsAt: '2026-10-16T12:00:00.000Z',
      });
      const otherLocation = await prisma.location.create({
        data: {
          id: randomUUID(),
          name: `${MARK} other ${randomUUID().slice(0, 8)}`,
          nameKey: `${MARK} ${randomUUID()}`,
          address: 'Av. Zezé Diogo',
        },
      });

      const response = await edit(
        admin.accessToken,
        id,
        sameBody([instructor.id], {
          discipline: 'skate',
          level: 'expert',
          date: '2026-10-21',
          start: '16:30',
          end: '17:45',
          locationId: otherLocation.id,
          capacity: 12,
          notes: '  Bring water  ',
        }),
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id,
        discipline: 'skate',
        level: 'expert',
        startsAt: '2026-10-21T19:30:00.000Z',
        endsAt: '2026-10-21T20:45:00.000Z',
        capacity: 12,
        notes: 'Bring water',
        location: { id: otherLocation.id },
        instructors: [{ id: instructor.id, name: 'Person instructor' }],
        seatsTaken: 0,
        students: [],
      });
      const read = await as(admin.accessToken, http().get(`/classes/${id}`));
      expect(read.body).toEqual(response.body);
      const week = await as(admin.accessToken, http().get('/classes?date=2026-10-21'));
      expect(week.body.items.map((item: { id: string }) => item.id)).toContain(id);
      const untouched = await stored(sibling);
      expect(untouched).toMatchObject({ discipline: 'surf', capacity: 8, notes: 'Bring a hat' });
      expect(untouched.startsAt.toISOString()).toBe('2026-10-16T11:00:00.000Z');
    });

    it('stores blank notes as none and replaces the instructors', async () => {
      const admin = await account();
      const first = await account('instructor');
      const second = await account('instructor');
      const id = await makeClass(admin.id, [first.id]);

      const response = await edit(admin.accessToken, id, sameBody([second.id, second.id], { notes: '   ' }));

      expect(response.status).toBe(200);
      expect(response.body.notes).toBeNull();
      expect((await stored(id)).instructors.map((link) => link.userId)).toEqual([second.id]);
    });

    it('answers 200 and leaves updatedAt untouched when nothing differs', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      const before = await stored(id);

      const response = await edit(admin.accessToken, id, sameBody([instructor.id]));

      expect(response.status).toBe(200);
      expect((await stored(id)).updatedAt).toEqual(before.updatedAt);
    });

    it('refuses a start in the past', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      for (const body of [
        { date: '2026-10-13' },
        { date: '2026-10-14', start: '07:00', end: '08:00' },
        { date: '2026-10-14', start: '10:00', end: '11:00' },
      ]) {
        const response = await edit(admin.accessToken, id, sameBody([instructor.id], body));

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['class.startsAt.past']);
      }
      expect((await stored(id)).startsAt.toISOString()).toBe('2026-10-15T11:00:00.000Z');
    });

    it('accepts a start one minute after now', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      const response = await edit(
        admin.accessToken,
        id,
        sameBody([instructor.id], { date: '2026-10-14', start: '10:01', end: '11:00' }),
      );

      expect(response.status).toBe(200);
    });

    it('on a started class changes only the instructors', async () => {
      const admin = await account();
      const first = await account('instructor');
      const second = await account('instructor');
      const id = await makeClass(admin.id, [first.id]);
      now = new Date('2026-10-15T11:30:00.000Z');

      const swap = await edit(admin.accessToken, id, sameBody([second.id]));
      expect(swap.status).toBe(200);
      expect((await stored(id)).instructors.map((link) => link.userId)).toEqual([second.id]);

      const refused = await edit(admin.accessToken, id, sameBody([second.id], { locationId: randomUUID() }));
      expect(refused.status).toBe(409);
      expect(refused.body.errors).toEqual(['class.started']);
      expect((await stored(id)).locationId).toBe(locationId);

      const same = await edit(admin.accessToken, id, sameBody([second.id]));
      expect(same.status).toBe(200);
    });

    it('on a started class counts a class starting exactly now as started', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      now = new Date('2026-10-15T11:00:00.000Z');

      const response = await edit(admin.accessToken, id, sameBody([instructor.id], { capacity: 9 }));

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['class.started']);
    });

    it('refuses a finished class, also when nothing differs', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      now = new Date('2026-10-15T12:00:00.000Z');

      for (const body of [sameBody([instructor.id]), sameBody([instructor.id], { capacity: 9 })]) {
        const response = await edit(admin.accessToken, id, body);

        expect(response.status).toBe(409);
        expect(response.body.errors).toEqual(['class.finished']);
      }
      expect((await stored(id)).capacity).toBe(8);
    });

    it('refuses a cancelled class, before the clock, and changes nothing', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      await withPhone(instructor.id);
      const id = await makeClass(admin.id, [instructor.id]);
      await prisma.schoolClass.update({ where: { id }, data: { cancelledAt: NOW, cancellationMessage: 'Mar grande' } });

      const response = await edit(admin.accessToken, id, sameBody([instructor.id], { capacity: 9 }));

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['class.cancelled']);
      expect((await stored(id)).capacity).toBe(8);
      expect(await prisma.notification.count({ where: { userId: instructor.id } })).toBe(0);
      expect(push.sent).toHaveLength(0);

      now = new Date('2026-10-16T00:00:00.000Z');
      const finished = await edit(admin.accessToken, id, sameBody([instructor.id]));
      expect(finished.body.errors).toEqual(['class.cancelled']);

      const malformed = await edit(admin.accessToken, id, sameBody([instructor.id], { capacity: 0 }));
      expect(malformed.status).toBe(422);
    });

    it('refuses a malformed body with every shape key, before the class state', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      now = new Date('2026-10-15T12:00:00.000Z');

      const response = await edit(admin.accessToken, id, {
        discipline: 'tennis',
        level: 'pro',
        date: '2026-02-30',
        start: '9am',
        capacity: 0,
        notes: 'x'.repeat(301),
        instructorIds: [],
        locationId: '',
      });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual([
        'class.discipline.invalid',
        'class.level.invalid',
        'class.date.invalid',
        'class.time.invalid',
        'class.capacity.invalid',
        'class.notes.max.length',
        'class.instructors.required',
        'class.location.required',
      ]);
    });

    it('refuses an end that is not after the start', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      const response = await edit(admin.accessToken, id, sameBody([instructor.id], { end: '08:00' }));

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['class.time.endBeforeStart']);
    });

    it('refuses an unknown or malformed id with 404', async () => {
      const admin = await account();
      const instructor = await account('instructor');

      for (const id of [randomUUID(), 'not-a-uuid']) {
        const response = await edit(admin.accessToken, id, sameBody([instructor.id]));

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['class.notFound']);
      }
    });

    it('refuses an unknown location, and an added instructor who is not an approved teacher', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      const location = await edit(admin.accessToken, id, sameBody([instructor.id], { locationId: randomUUID() }));
      expect(location.status).toBe(422);
      expect(location.body.errors).toEqual(['class.location.notFound']);

      for (const added of [await account('student'), await account('instructor', 'pending')]) {
        const response = await edit(admin.accessToken, id, sameBody([instructor.id, added.id]));

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['class.instructors.invalid']);
      }
      expect((await stored(id)).instructors).toHaveLength(1);
    });

    it('keeps an instructor who is now a student', async () => {
      const admin = await account();
      const student = await account('student');
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [student.id]);

      const response = await edit(admin.accessToken, id, sameBody([student.id, instructor.id]));

      expect(response.status).toBe(200);
      expect((await stored(id)).instructors.map((link) => link.userId).sort()).toEqual(
        [student.id, instructor.id].sort(),
      );
    });

    it('refuses everyone but an approved admin, and a missing token', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      const body = sameBody([instructor.id], { capacity: 9 });

      expect((await edit(undefined, id, body)).status).toBe(401);

      const student = await edit((await account('student')).accessToken, id, body);
      expect(student.status).toBe(403);
      expect(student.body.errors).toEqual(['user.role.notAdmin']);
      expect((await edit(instructor.accessToken, id, body)).body.errors).toEqual(['user.role.notAdmin']);

      for (const status of NOT_APPROVED) {
        const response = await edit((await account('admin', status)).accessToken, id, body);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      }
      expect((await stored(id)).capacity).toBe(8);
    });

    describe('notifies', () => {
      const notificationsOf = (userId: string) =>
        prisma.notification.findMany({
          where: { userId, type: { in: ['class.edited', 'class.assigned', 'class.unassigned'] } },
        });

      it('tells kept, added and removed instructors, and never the editing admin', async () => {
        const admin = await account();
        const kept = await account('instructor');
        const removed = await account('instructor');
        const added = await account('instructor');
        for (const person of [admin, kept, removed, added]) await withPhone(person.id);
        const id = await makeClass(admin.id, [kept.id, removed.id, admin.id]);

        const response = await edit(
          admin.accessToken,
          id,
          sameBody([kept.id, added.id, admin.id], { start: '09:00', end: '10:00' }),
        );

        expect(response.status).toBe(200);
        const params = { classId: id, discipline: 'surf', startsAt: '2026-10-15T12:00:00.000Z' };
        const keptNotifications = await notificationsOf(kept.id);
        expect(keptNotifications.map((item) => [item.type, item.params])).toEqual([['class.edited', params]]);
        expect((await notificationsOf(added.id)).map((item) => [item.type, item.params])).toEqual([
          ['class.assigned', { count: 1, discipline: 'surf' }],
        ]);
        expect((await notificationsOf(removed.id)).map((item) => [item.type, item.params])).toEqual([
          ['class.unassigned', params],
        ]);
        expect(await notificationsOf(admin.id)).toHaveLength(0);

        expect(push.sent).toHaveLength(3);
        const edited = push.sent.find((message) => message.type === 'class.edited')!;
        expect(renderPush('class.edited', edited.params, 'pt-BR')).toEqual({
          title: 'Aula alterada',
          body: 'A aula de Surf de 15/10 às 09:00 foi alterada. Abra o app para ver.',
        });
        const unassigned = push.sent.find((message) => message.type === 'class.unassigned')!;
        expect(renderPush('class.unassigned', unassigned.params, 'pt-BR').title).toBe('Você saiu de uma aula');
      });

      describe('edit tells students', () => {
        const enrol = (classId: string, studentId: string, status: 'approved' | 'pending' | 'withdrawn' | 'expired' | 'denied') =>
          prisma.enrolment.create({
            data: { id: randomUUID(), classId, studentId, status, requestedAt: NOW },
          });

        it('tells the seated student, the pending request and the instructor, but not the ended ones', async () => {
          const admin = await account();
          const instructor = await account('instructor');
          const seated = await account('student');
          const pending = await account('student');
          const ended = await Promise.all([account('student'), account('student'), account('student')]);
          await withPhone(seated.id);
          const id = await makeClass(admin.id, [instructor.id]);
          await enrol(id, seated.id, 'approved');
          await enrol(id, pending.id, 'pending');
          await enrol(id, ended[0]!.id, 'withdrawn');
          await enrol(id, ended[1]!.id, 'expired');
          await enrol(id, ended[2]!.id, 'denied');

          const response = await edit(admin.accessToken, id, sameBody([instructor.id], { start: '09:00', end: '10:00' }));

          expect(response.status).toBe(200);
          const params = { classId: id, discipline: 'surf', startsAt: '2026-10-15T12:00:00.000Z' };
          for (const person of [seated, pending, instructor]) {
            expect((await notificationsOf(person.id)).map((item) => [item.type, item.params])).toEqual([
              ['class.edited', params],
            ]);
          }
          for (const person of ended) expect(await notificationsOf(person.id)).toHaveLength(0);
          expect(push.sent.map((message) => message.type)).toEqual(['class.edited']);
        });

        it('tells no student when only the instructors change or nothing differs', async () => {
          const admin = await account();
          const kept = await account('instructor');
          const added = await account('instructor');
          const seated = await account('student');
          const id = await makeClass(admin.id, [kept.id]);
          await enrol(id, seated.id, 'approved');

          await edit(admin.accessToken, id, sameBody([kept.id, added.id]));
          await edit(admin.accessToken, id, sameBody([kept.id, added.id]));

          expect(await notificationsOf(seated.id)).toHaveLength(0);
        });

        it('keeps the 200 and the change when the push provider fails', async () => {
          const admin = await account();
          const seated = await account('student');
          await withPhone(seated.id);
          const id = await makeClass(admin.id, [admin.id]);
          await enrol(id, seated.id, 'approved');
          push.failing = true;

          const response = await edit(admin.accessToken, id, sameBody([admin.id], { capacity: 9 }));

          expect(response.status).toBe(200);
          expect((await stored(id)).capacity).toBe(9);
        });
      });

      it('tells only the added and removed instructors when only the instructors change', async () => {
        const admin = await account();
        const kept = await account('instructor');
        const removed = await account('instructor');
        const added = await account('instructor');
        const id = await makeClass(admin.id, [kept.id, removed.id]);

        const response = await edit(admin.accessToken, id, sameBody([kept.id, added.id]));

        expect(response.status).toBe(200);
        expect(await notificationsOf(kept.id)).toHaveLength(0);
        expect((await notificationsOf(added.id)).map((item) => item.type)).toEqual(['class.assigned']);
        expect((await notificationsOf(removed.id)).map((item) => item.type)).toEqual(['class.unassigned']);
      });

      it('tells nobody when nothing differs or the edit is refused', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id);
        const id = await makeClass(admin.id, [instructor.id]);

        await edit(admin.accessToken, id, sameBody([instructor.id]));
        await edit(admin.accessToken, id, sameBody([instructor.id], { capacity: 0 }));

        expect(await notificationsOf(instructor.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(0);
      });

      it('keeps the 200 and the change when the push provider fails', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id);
        const id = await makeClass(admin.id, [instructor.id]);
        push.failing = true;

        const response = await edit(admin.accessToken, id, sameBody([instructor.id], { capacity: 9 }));

        expect(response.status).toBe(200);
        expect((await stored(id)).capacity).toBe(9);
        expect(await notificationsOf(instructor.id)).toHaveLength(1);
      });
    });
  });

  describe('POST /classes/:id/cancel', () => {
    const cancel = (token: string | undefined, id: string, body?: Record<string, unknown>) =>
      as(token, http().post(`/classes/${id}/cancel`)).send(body ?? {});

    // Tomorrow (2026-10-15) 08:00-09:00 in Fortaleza, unless the test moves it.
    async function makeClass(
      creatorId: string,
      instructorIds: string[],
      overrides: { startsAt?: string; endsAt?: string } = {},
    ) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date(overrides.startsAt ?? '2026-10-15T11:00:00.000Z'),
          endsAt: new Date(overrides.endsAt ?? '2026-10-15T12:00:00.000Z'),
          locationId,
          capacity: 8,
          createdBy: creatorId,
          instructors: { create: instructorIds.map((userId) => ({ userId })) },
        },
      });
      return id;
    }

    const stored = (id: string) => prisma.schoolClass.findUniqueOrThrow({ where: { id } });

    async function withPhone(userId: string, locale = 'pt-BR') {
      await prisma.pushToken.create({
        data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
      });
    }

    const notificationsOf = (userId: string) =>
      prisma.notification.findMany({ where: { userId, type: 'class.cancelled' } });

    it("cancels a class that hasn't started and reads the cancellation back everywhere", async () => {
      const admin = await account();
      const student = await account('student');
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      const sibling = await makeClass(admin.id, [instructor.id], {
        startsAt: '2026-10-16T11:00:00.000Z',
        endsAt: '2026-10-16T12:00:00.000Z',
      });

      const response = await cancel(admin.accessToken, id, { message: '  Mar muito grande.  ' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id,
        cancelledAt: NOW.toISOString(),
        cancellationMessage: 'Mar muito grande.',
        seatsTaken: 0,
        students: [],
      });
      const read = await as(student.accessToken, http().get(`/classes/${id}`));
      expect(read.body).toEqual({ ...response.body, pendingRequests: null });
      const week = await as(student.accessToken, http().get('/classes?date=2026-10-15'));
      const items = week.body.items as { id: string; cancelledAt: string | null; cancellationMessage: string | null }[];
      expect(items.find((item) => item.id === id)).toMatchObject({
        cancelledAt: NOW.toISOString(),
        cancellationMessage: 'Mar muito grande.',
      });
      expect(items.find((item) => item.id === sibling)).toMatchObject({
        cancelledAt: null,
        cancellationMessage: null,
      });
      expect((await stored(sibling)).cancelledAt).toBeNull();
    });

    it.each([[undefined], [null], [''], ['   ']])('cancels with no message for %j', async (message) => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      const response = await cancel(admin.accessToken, id, message === undefined ? {} : { message });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ cancelledAt: NOW.toISOString(), cancellationMessage: null });
    });

    it('cancels with an empty request body', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      const response = await as(admin.accessToken, http().post(`/classes/${id}/cancel`));

      expect(response.status).toBe(200);
      expect(response.body.cancellationMessage).toBeNull();
    });

    it('reads a class that was never cancelled with no cancellation', async () => {
      const admin = await account();
      const id = await makeClass(admin.id, []);

      const read = await as(admin.accessToken, http().get(`/classes/${id}`));

      expect(read.body).toMatchObject({ cancelledAt: null, cancellationMessage: null });
    });

    it('cancels a started class, also exactly at its start', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);

      now = new Date('2026-10-15T11:00:00.000Z');
      const atStart = await cancel(admin.accessToken, id);
      expect(atStart.status).toBe(200);
      expect(atStart.body.cancelledAt).toBe('2026-10-15T11:00:00.000Z');

      const other = await makeClass(admin.id, [instructor.id]);
      now = new Date('2026-10-15T11:30:00.000Z');
      const during = await cancel(admin.accessToken, other, { message: 'Trovoada' });
      expect(during.status).toBe(200);
      expect(during.body.cancellationMessage).toBe('Trovoada');
    });

    it('refuses a finished class, a cancelled one and a second simultaneous cancel', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const finished = await makeClass(admin.id, [instructor.id]);
      now = new Date('2026-10-15T12:00:00.000Z');

      const late = await cancel(admin.accessToken, finished, { message: 'Tarde demais' });
      expect(late.status).toBe(409);
      expect(late.body.errors).toEqual(['class.finished']);
      expect((await stored(finished)).cancelledAt).toBeNull();

      now = NOW;
      const id = await makeClass(admin.id, [instructor.id]);
      const first = await cancel(admin.accessToken, id, { message: 'Primeira' });
      const second = await cancel(admin.accessToken, id, { message: 'Segunda' });
      expect(first.status).toBe(200);
      expect(second.status).toBe(409);
      expect(second.body.errors).toEqual(['class.cancelled']);
      expect(await stored(id)).toMatchObject({ cancelledAt: NOW, cancellationMessage: 'Primeira' });

      now = new Date('2026-10-16T00:00:00.000Z');
      const afterEnd = await cancel(admin.accessToken, id);
      expect(afterEnd.body.errors).toEqual(['class.cancelled']);

      now = NOW;
      const raced = await makeClass(admin.id, [instructor.id]);
      const results = await Promise.all([
        cancel(admin.accessToken, raced, { message: 'A' }),
        cancel(admin.accessToken, raced, { message: 'B' }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
      const loser = results.find((result) => result.status === 409)!;
      expect(loser.body.errors).toEqual(['class.cancelled']);
      const winner = results.find((result) => result.status === 200)!;
      expect((await stored(raced)).cancellationMessage).toBe(winner.body.cancellationMessage);
    });

    it('checks the message, the id and who may cancel, storing and sending nothing on a refusal', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const student = await account('student');
      await withPhone(instructor.id);
      const id = await makeClass(admin.id, [instructor.id]);

      const exact = await cancel(admin.accessToken, id, { message: ` ${'m'.repeat(300)} ` });
      expect(exact.status).toBe(200);
      expect(exact.body.cancellationMessage).toBe('m'.repeat(300));

      const other = await makeClass(admin.id, [instructor.id]);
      for (const message of ['m'.repeat(301), 42, ['x']]) {
        const response = await cancel(admin.accessToken, other, { message } as never);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['class.cancellationMessage.max.length']);
      }

      for (const unknown of [randomUUID(), 'not-a-uuid']) {
        const response = await cancel(admin.accessToken, unknown);

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['class.notFound']);
      }

      for (const person of [student, instructor]) {
        const response = await cancel(person.accessToken, other);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.role.notAdmin']);
      }
      for (const status of NOT_APPROVED) {
        const person = await account('admin', status);

        const response = await cancel(person.accessToken, other);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      }
      expect((await cancel(undefined, other)).status).toBe(401);

      expect((await stored(other)).cancelledAt).toBeNull();
      expect(await notificationsOf(instructor.id)).toHaveLength(1);
      expect(push.sent).toHaveLength(1);
    });

    describe('notifies', () => {
      it('tells the instructors, with the message, and never the admin who cancels', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id, 'pt-BR');
        await withPhone(admin.id);
        const id = await makeClass(admin.id, [instructor.id, admin.id]);

        const response = await cancel(admin.accessToken, id, { message: 'Mar muito grande.' });

        expect(response.status).toBe(200);
        const [notification] = await notificationsOf(instructor.id);
        expect(notification!.params).toEqual({
          classId: id,
          discipline: 'surf',
          startsAt: '2026-10-15T11:00:00.000Z',
          message: 'Mar muito grande.',
        });
        expect(await notificationsOf(admin.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(1);
        expect(push.sent[0]).toMatchObject({ type: 'class.cancelled', locale: 'pt-BR' });
        expect(renderPush('class.cancelled', push.sent[0]!.params, 'pt-BR')).toEqual({
          title: 'Aula cancelada',
          body: 'Surf, 15/10 às 08:00: Mar muito grande.',
        });
      });

      it('leaves the message out of the details when there is none', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id, 'en');
        const id = await makeClass(admin.id, [instructor.id]);

        await cancel(admin.accessToken, id);

        const [notification] = await notificationsOf(instructor.id);
        expect(notification!.params).toEqual({
          classId: id,
          discipline: 'surf',
          startsAt: '2026-10-15T11:00:00.000Z',
        });
        expect(renderPush('class.cancelled', push.sent[0]!.params, 'en').body).toBe(
          'Your Surf class on 10/15 at 08:00 was cancelled.',
        );
      });

      it('tells nobody when the admin teaches the class alone', async () => {
        const admin = await account();
        await withPhone(admin.id);
        const id = await makeClass(admin.id, [admin.id]);

        const response = await cancel(admin.accessToken, id);

        expect(response.status).toBe(200);
        expect(await notificationsOf(admin.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(0);
      });

      it('ends the pending and approved enrolments as classCancelled and tells those students', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        const pending = await account('student');
        const approved = await account('student');
        const withdrawn = await account('student');
        await withPhone(pending.id, 'es');
        await withPhone(withdrawn.id);
        const id = await makeClass(admin.id, [instructor.id]);
        const seed = (studentId: string, status: 'pending' | 'approved' | 'withdrawn') =>
          prisma.enrolment.create({
            data: { id: randomUUID(), classId: id, studentId, status, requestedAt: new Date('2026-10-13T12:00:00.000Z') },
          });
        await seed(pending.id, 'pending');
        await seed(approved.id, 'approved');
        await seed(withdrawn.id, 'withdrawn');

        const response = await cancel(admin.accessToken, id, { message: 'Mar muito grande.' });

        expect(response.status).toBe(200);
        const statuses = await prisma.enrolment.findMany({ where: { classId: id }, orderBy: { studentId: 'asc' } });
        expect(Object.fromEntries(statuses.map((row) => [row.studentId, row.status]))).toEqual({
          [pending.id]: 'classCancelled',
          [approved.id]: 'classCancelled',
          [withdrawn.id]: 'withdrawn',
        });
        const params = {
          classId: id,
          discipline: 'surf',
          startsAt: '2026-10-15T11:00:00.000Z',
          message: 'Mar muito grande.',
        };
        expect((await notificationsOf(pending.id))[0]!.params).toEqual(params);
        expect((await notificationsOf(approved.id))[0]!.params).toEqual(params);
        expect(await notificationsOf(withdrawn.id)).toHaveLength(0);
        expect(await notificationsOf(admin.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(1);
        expect(push.sent[0]).toMatchObject({ type: 'class.cancelled', locale: 'es' });
        expect(renderPush('class.cancelled', push.sent[0]!.params, 'es').title).toBe('Clase cancelada');
      });

      it('keeps the 200 and the cancellation when the push provider fails', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id);
        const id = await makeClass(admin.id, [instructor.id]);
        push.failing = true;

        const response = await cancel(admin.accessToken, id, { message: 'Trovoada' });

        expect(response.status).toBe(200);
        expect(await stored(id)).toMatchObject({ cancelledAt: NOW, cancellationMessage: 'Trovoada' });
        expect(await notificationsOf(instructor.id)).toHaveLength(1);
      });
    });
  });

  describe('DELETE /classes/:id', () => {
    const remove = (token: string | undefined, id: string) => as(token, http().delete(`/classes/${id}`));

    // Tomorrow (2026-10-15) 08:00-09:00 in Fortaleza, unless the test moves it.
    async function makeClass(
      creatorId: string,
      instructorIds: string[],
      overrides: { startsAt?: string; endsAt?: string; cancelledAt?: Date } = {},
    ) {
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date(overrides.startsAt ?? '2026-10-15T11:00:00.000Z'),
          endsAt: new Date(overrides.endsAt ?? '2026-10-15T12:00:00.000Z'),
          locationId,
          capacity: 8,
          createdBy: creatorId,
          cancelledAt: overrides.cancelledAt ?? null,
          instructors: { create: instructorIds.map((userId) => ({ userId })) },
        },
      });
      return id;
    }

    const exists = async (id: string) => (await prisma.schoolClass.findUnique({ where: { id } })) !== null;
    const instructorRows = (classId: string) => prisma.classInstructor.count({ where: { classId } });

    async function withPhone(userId: string, locale = 'pt-BR') {
      await prisma.pushToken.create({
        data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
      });
    }

    const notificationsOf = (userId: string) =>
      prisma.notification.findMany({ where: { userId, type: 'class.deleted' } });

    it("deletes a class that hasn't started and takes it off the schedule", async () => {
      const admin = await account();
      const student = await account('student');
      const instructor = await account('instructor');
      const id = await makeClass(admin.id, [instructor.id]);
      const sibling = await makeClass(admin.id, [instructor.id]);

      const response = await remove(admin.accessToken, id);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      const read = await as(student.accessToken, http().get(`/classes/${id}`));
      expect(read.status).toBe(404);
      expect(read.body.errors).toEqual(['class.notFound']);
      const week = await as(student.accessToken, http().get('/classes?date=2026-10-15'));
      const ids = (week.body.items as { id: string }[]).map((item) => item.id);
      expect(ids).not.toContain(id);
      expect(ids).toContain(sibling);
      expect(await instructorRows(id)).toBe(0);
      expect(await exists(sibling)).toBe(true);
      expect(await instructorRows(sibling)).toBe(1);
    });

    it('deletes a class starting one minute after now', async () => {
      const admin = await account();
      const id = await makeClass(admin.id, [admin.id], {
        startsAt: new Date(NOW.getTime() + 60_000).toISOString(),
        endsAt: new Date(NOW.getTime() + 3_660_000).toISOString(),
      });

      expect((await remove(admin.accessToken, id)).status).toBe(204);
      expect(await exists(id)).toBe(false);
    });

    it('refuses a class with a pending request, answering how many seats and requests it has', async () => {
      const admin = await account();
      const student = await account('student');
      const id = await makeClass(admin.id, [admin.id]);
      await prisma.enrolment.create({
        data: { id: randomUUID(), classId: id, studentId: student.id, status: 'pending', requestedAt: NOW },
      });

      const response = await remove(admin.accessToken, id);

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['class.delete.notEmpty']);
      expect(response.body.details).toEqual({ seatsTaken: 0, pendingRequests: 1 });
      expect(await exists(id)).toBe(true);
    });

    it('refuses a started class, one starting exactly now and a cancelled one, deleting nothing', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      await withPhone(instructor.id);
      const started = await makeClass(admin.id, [instructor.id], {
        startsAt: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
        endsAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
      });
      const atStart = await makeClass(admin.id, [instructor.id], {
        startsAt: NOW.toISOString(),
        endsAt: new Date(NOW.getTime() + 3_600_000).toISOString(),
      });
      const finished = await makeClass(admin.id, [instructor.id], {
        startsAt: '2026-10-13T11:00:00.000Z',
        endsAt: '2026-10-13T12:00:00.000Z',
      });
      const cancelled = await makeClass(admin.id, [instructor.id], { cancelledAt: new Date('2026-10-14T10:00:00.000Z') });
      const cancelledAndStarted = await makeClass(admin.id, [instructor.id], {
        startsAt: '2026-10-13T11:00:00.000Z',
        endsAt: '2026-10-13T12:00:00.000Z',
        cancelledAt: new Date('2026-10-12T10:00:00.000Z'),
      });

      for (const id of [started, atStart, finished]) {
        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(409);
        expect(response.body.errors).toEqual(['class.started']);
      }
      for (const id of [cancelled, cancelledAndStarted]) {
        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(409);
        expect(response.body.errors).toEqual(['class.cancelled']);
      }

      for (const id of [started, atStart, finished, cancelled, cancelledAndStarted]) {
        expect(await exists(id)).toBe(true);
        expect(await instructorRows(id)).toBe(1);
      }
      expect(await notificationsOf(instructor.id)).toHaveLength(0);
      expect(push.sent).toHaveLength(0);
    });

    it('checks who may delete, the id and a second simultaneous delete, notifying nobody on a refusal', async () => {
      const admin = await account();
      const instructor = await account('instructor');
      const student = await account('student');
      await withPhone(instructor.id);
      const id = await makeClass(admin.id, [instructor.id]);

      for (const person of [student, instructor]) {
        const response = await remove(person.accessToken, id);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.role.notAdmin']);
      }
      for (const status of NOT_APPROVED) {
        const person = await account('admin', status);

        const response = await remove(person.accessToken, id);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      }
      expect((await remove(undefined, id)).status).toBe(401);
      for (const unknown of [randomUUID(), 'not-a-uuid']) {
        const response = await remove(admin.accessToken, unknown);

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['class.notFound']);
      }
      expect(await exists(id)).toBe(true);
      expect(push.sent).toHaveLength(0);
      expect(await notificationsOf(instructor.id)).toHaveLength(0);

      const results = await Promise.all([remove(admin.accessToken, id), remove(admin.accessToken, id)]);

      expect(results.map((result) => result.status).sort()).toEqual([204, 404]);
      expect(results.find((result) => result.status === 404)!.body.errors).toEqual(['class.notFound']);
      expect(await exists(id)).toBe(false);
      expect(await notificationsOf(instructor.id)).toHaveLength(1);
    });

    describe('notifies', () => {
      it('tells the instructors which class went away and never the admin who deletes', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id, 'pt-BR');
        await withPhone(admin.id);
        const id = await makeClass(admin.id, [instructor.id, admin.id]);

        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(204);
        const [notification] = await notificationsOf(instructor.id);
        expect(notification!.params).toEqual({ discipline: 'surf', startsAt: '2026-10-15T11:00:00.000Z' });
        expect(await notificationsOf(admin.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(1);
        expect(push.sent[0]).toMatchObject({ type: 'class.deleted', locale: 'pt-BR' });
        expect(renderPush('class.deleted', push.sent[0]!.params, 'pt-BR')).toEqual({
          title: 'Aula excluída',
          body: 'A aula de Surf de 15/10 às 08:00 foi excluída.',
        });
      });

      it('tells nobody when the admin teaches the class alone', async () => {
        const admin = await account();
        await withPhone(admin.id);
        const id = await makeClass(admin.id, [admin.id]);

        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(204);
        expect(await notificationsOf(admin.id)).toHaveLength(0);
        expect(push.sent).toHaveLength(0);
      });

      it('keeps the 204 and the deletion when the push provider fails', async () => {
        const admin = await account();
        const instructor = await account('instructor');
        await withPhone(instructor.id);
        const id = await makeClass(admin.id, [instructor.id]);
        push.failing = true;

        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(204);
        expect(await exists(id)).toBe(false);
        expect(await notificationsOf(instructor.id)).toHaveLength(1);
      });
    });
  });
});
