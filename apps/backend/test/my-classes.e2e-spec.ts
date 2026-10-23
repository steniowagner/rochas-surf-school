import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'my-classes.e2e.example.com';
const MARK = 'e2emine';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
type EnrolmentStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'withdrawn'
  | 'expired'
  | 'cancelled'
  | 'takenOut'
  | 'classCancelled';

interface Account {
  id: string;
  accessToken: string;
}

describe('My classes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let locationId: string;
  let admin: Account;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue({ send: async () => [], getReceipts: async () => ({}) })
      .overrideProvider(ClassesClockProvider)
      .useValue({ now: () => new Date(NOW.getTime()) })
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
    admin = await account('admin');
  });

  afterEach(async () => {
    // The classes go first (their enrolments cascade), then the location and the users.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  const mine = (token?: string) => as(token, http().get('/classes/mine'));
  const history = (token?: string, query: Record<string, string> = {}) =>
    as(token, http().get('/classes/mine/history').query(query));

  async function account(role: Role = 'student', status: Status = 'approved'): Promise<Account> {
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

  /** A one-hour class starting `offsetMs` from now. */
  async function makeClass(offsetMs: number, cancelled = false): Promise<string> {
    return makeClassAt(new Date(NOW.getTime() + offsetMs), cancelled);
  }

  /** A one-hour class starting at `startsAt`. */
  async function makeClassAt(startsAt: Date, cancelled = false): Promise<string> {
    const id = randomUUID();
    await prisma.schoolClass.create({
      data: {
        id,
        discipline: 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        locationId,
        capacity: 8,
        createdBy: admin.id,
        cancelledAt: cancelled ? new Date(NOW.getTime() - DAY) : null,
      },
    });
    return id;
  }

  async function enrol(
    classId: string,
    studentId: string,
    status: EnrolmentStatus,
    requestedAt = new Date('2026-09-01T12:00:00.000Z'),
  ): Promise<string> {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: { id, classId, studentId, status, requestedAt },
    });
    return id;
  }

  describe('mine', () => {
    it("lists the student's not-finished classes by start, each with its latest status", async () => {
      const ana = await account();
      const other = await account();
      const upcomingPending = await makeClass(2 * DAY);
      const underWay = await makeClass(-HOUR / 2);
      const upcomingWithdrawn = await makeClass(DAY);
      const cancelled = await makeClass(3 * DAY, true);
      const finished = await makeClass(-DAY);
      const notAsked = await makeClass(DAY + HOUR);
      await enrol(upcomingPending, ana.id, 'withdrawn', new Date('2026-09-01T12:00:00.000Z'));
      const pendingId = await enrol(upcomingPending, ana.id, 'pending', new Date('2026-09-02T12:00:00.000Z'));
      await enrol(underWay, ana.id, 'approved');
      await enrol(upcomingWithdrawn, ana.id, 'withdrawn');
      await enrol(cancelled, ana.id, 'classCancelled');
      await enrol(finished, ana.id, 'approved');
      await enrol(notAsked, other.id, 'pending');

      const response = await mine(ana.accessToken);

      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { id: string; myEnrolment: { status: string } }) => [
        item.id,
        item.myEnrolment.status,
      ])).toEqual([
        [underWay, 'approved'],
        [upcomingWithdrawn, 'withdrawn'],
        [upcomingPending, 'pending'],
        [cancelled, 'classCancelled'],
      ]);
      expect(response.body.items[2].myEnrolment).toEqual({
        id: pendingId,
        status: 'pending',
        requestedAt: '2026-09-02T12:00:00.000Z',
        reason: null,
      });
      expect(response.body.items[0]).toMatchObject({ seatsTaken: 1, students: [{ id: ana.id }] });
      expect(response.body.items[3].cancelledAt).not.toBeNull();
    });

    it('answers no items to a student without enrolments', async () => {
      const ana = await account();
      await enrol(await makeClass(DAY), (await account()).id, 'pending');

      const response = await mine(ana.accessToken);

      expect([response.status, response.body]).toEqual([200, { items: [] }]);
    });

    it('refuses instructors and admins, accounts not approved and requests without a token', async () => {
      for (const role of ['instructor', 'admin'] as const) {
        const response = await mine((await account(role)).accessToken);
        expect([response.status, response.body.errors]).toEqual([403, ['enrolment.role.notStudent']]);
      }

      const pending = await mine((await account('student', 'pending')).accessToken);
      expect([pending.status, pending.body.errors]).toEqual([403, ['user.status.notApproved']]);
      expect((await mine()).status).toBe(401);
    });
  });

  describe('history', () => {
    const ids = (response: request.Response) => response.body.items.map((item: { id: string }) => item.id);

    it('lists every class taken on a Fortaleza day of the period, newest first, unpaged', async () => {
      const ana = await account();
      // 00:00 Fortaleza on 1 August, 23:59 Fortaleza on 31 August, and 25 classes in between.
      const firstMinute = await makeClassAt(new Date('2026-08-01T03:00:00.000Z'));
      const lastMinute = await makeClassAt(new Date('2026-09-01T02:59:00.000Z'));
      const between: string[] = [];
      for (let day = 2; day <= 26; day += 1) {
        between.unshift(await makeClassAt(new Date(Date.UTC(2026, 7, day, 12))));
      }
      // 00:00 Fortaleza on 1 September and 23:59 Fortaleza on 31 July.
      const nextMonth = await makeClassAt(new Date('2026-09-01T03:00:00.000Z'));
      const previousMonth = await makeClassAt(new Date('2026-08-01T02:59:00.000Z'));
      for (const id of [firstMinute, lastMinute, ...between, nextMonth, previousMonth]) {
        await enrol(id, ana.id, 'approved');
      }

      const response = await history(ana.accessToken, { from: '2026-08-01', to: '2026-08-31' });

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(['items']);
      expect(ids(response)).toEqual([lastMinute, ...between, firstMinute]);
      expect(response.body.items[0]).toMatchObject({ seatsTaken: 1, myEnrolment: { status: 'approved' } });
    });

    it('orders classes starting together by id, descending', async () => {
      const ana = await account();
      const startsAt = new Date('2026-08-10T12:00:00.000Z');
      const pair = [await makeClassAt(startsAt), await makeClassAt(startsAt)];
      for (const id of pair) await enrol(id, ana.id, 'approved');

      const response = await history(ana.accessToken, { from: '2026-08-10', to: '2026-08-10' });

      expect(ids(response)).toEqual([...pair].sort().reverse());
    });

    it('answers one day when from equals to', async () => {
      const ana = await account();
      const onTheDay = await makeClassAt(new Date('2026-08-14T12:00:00.000Z'));
      const dayBefore = await makeClassAt(new Date('2026-08-13T12:00:00.000Z'));
      const dayAfter = await makeClassAt(new Date('2026-08-15T12:00:00.000Z'));
      for (const id of [onTheDay, dayBefore, dayAfter]) await enrol(id, ana.id, 'approved');

      const response = await history(ana.accessToken, { from: '2026-08-14', to: '2026-08-14' });

      expect([response.status, ids(response)]).toEqual([200, [onTheDay]]);
    });

    it('leaves out every class where no seat was held at the end, whatever its date', async () => {
      const ana = await account();
      const kept = await makeClass(-DAY);
      await enrol(kept, ana.id, 'approved');
      for (const status of ['cancelled', 'takenOut', 'denied', 'expired', 'withdrawn', 'pending'] as const) {
        await enrol(await makeClass(-2 * DAY), ana.id, status);
      }
      // A seat given up later: the latest enrolment isn't the approved one.
      const givenUp = await makeClass(-3 * DAY);
      await enrol(givenUp, ana.id, 'approved', new Date('2026-09-01T12:00:00.000Z'));
      await enrol(givenUp, ana.id, 'withdrawn', new Date('2026-09-02T12:00:00.000Z'));
      await enrol(await makeClass(-4 * DAY, true), ana.id, 'approved');
      await enrol(await makeClass(-HOUR / 2), ana.id, 'approved');
      await enrol(await makeClass(DAY), ana.id, 'approved');
      await enrol(await makeClass(-5 * DAY), (await account()).id, 'approved');

      const response = await history(ana.accessToken, { from: '2026-10-01', to: '2026-10-31' });

      expect([response.status, ids(response)]).toEqual([200, [kept]]);
    });

    it('answers no items when nothing was taken in the period', async () => {
      const ana = await account();
      await enrol(await makeClassAt(new Date('2026-07-10T12:00:00.000Z')), ana.id, 'approved');

      const response = await history(ana.accessToken, { from: '2026-08-01', to: '2026-08-31' });

      expect([response.status, response.body]).toEqual([200, { items: [] }]);
    });

    it('accepts 42 days and refuses a longer period or one that ends before it starts with 422', async () => {
      const ana = await account();

      const longest = await history(ana.accessToken, { from: '2026-08-01', to: '2026-09-11' });
      expect([longest.status, longest.body]).toEqual([200, { items: [] }]);
      for (const query of [
        { from: '2026-08-01', to: '2026-09-12' },
        { from: '2026-08-02', to: '2026-08-01' },
      ]) {
        const response = await history(ana.accessToken, query);
        expect([response.status, response.body.errors]).toEqual([422, ['class.range.invalid']]);
      }
    });

    it('answers 422 for a missing or unreal date', async () => {
      const ana = await account();

      const cases: [Record<string, string>, string[]][] = [
        [{ page: '1', perPage: '20' }, ['class.from.invalid', 'class.to.invalid']],
        [{ from: '2026-02-30', to: '2026-03-01' }, ['class.from.invalid']],
        [{ from: '2026-08-01' }, ['class.to.invalid']],
        [{ from: '01/08/2026', to: '2026-08-31x' }, ['class.from.invalid', 'class.to.invalid']],
      ];
      for (const [query, errors] of cases) {
        const response = await history(ana.accessToken, query);
        expect([response.status, response.body.errors]).toEqual([422, errors]);
      }
    });

    it('refuses instructors, admins and accounts not approved before checking the period', async () => {
      for (const role of ['instructor', 'admin'] as const) {
        const response = await history((await account(role)).accessToken, { from: 'x' });
        expect([response.status, response.body.errors]).toEqual([403, ['enrolment.role.notStudent']]);
      }

      const deleted = await history((await account('student', 'deleted')).accessToken);
      expect([deleted.status, deleted.body.errors]).toEqual([403, ['user.status.notApproved']]);
      expect((await history(undefined, { from: '2026-08-01', to: '2026-08-31' })).status).toBe(401);
    });
  });
});
