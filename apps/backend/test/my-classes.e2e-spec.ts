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
    const id = randomUUID();
    const startsAt = new Date(NOW.getTime() + offsetMs);
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
    it('pages the finished classes where the student held a seat, newest first', async () => {
      const ana = await account();
      const taken: string[] = [];
      for (let day = 1; day <= 25; day += 1) {
        const id = await makeClass(-day * DAY);
        await enrol(id, ana.id, 'approved');
        taken.push(id);
      }

      const first = await history(ana.accessToken, { page: '1', perPage: '20' });
      const second = await history(ana.accessToken, { page: '2', perPage: '20' });

      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({ total: 25, page: 1, perPage: 20 });
      expect(first.body.items.map((item: { id: string }) => item.id)).toEqual(taken.slice(0, 20));
      expect(first.body.items[0]).toMatchObject({ seatsTaken: 1, myEnrolment: { status: 'approved' } });
      expect(second.body).toMatchObject({ total: 25, page: 2, perPage: 20 });
      expect(second.body.items.map((item: { id: string }) => item.id)).toEqual(taken.slice(20));
    });

    it('defaults to the first 20 and leaves out every class where no seat was held at the end', async () => {
      const ana = await account();
      const kept = await makeClass(-DAY);
      await enrol(kept, ana.id, 'approved');
      for (const status of ['cancelled', 'takenOut', 'denied', 'expired', 'withdrawn'] as const) {
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

      const response = await history(ana.accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 1, page: 1, perPage: 20 });
      expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([kept]);
    });

    it('answers 422 for a page or perPage that is not a whole number in range', async () => {
      const ana = await account();

      const both = await history(ana.accessToken, { page: '0', perPage: '51' });
      expect([both.status, both.body.errors]).toEqual([422, ['class.page.invalid', 'class.perPage.invalid']]);
      for (const query of [{ page: '1.5' }, { page: 'x' }, { perPage: '0' }, { perPage: '-3' }]) {
        expect((await history(ana.accessToken, query)).status).toBe(422);
      }
    });

    it('refuses instructors, admins and accounts not approved', async () => {
      for (const role of ['instructor', 'admin'] as const) {
        const response = await history((await account(role)).accessToken);
        expect([response.status, response.body.errors]).toEqual([403, ['enrolment.role.notStudent']]);
      }

      const deleted = await history((await account('student', 'deleted')).accessToken);
      expect([deleted.status, deleted.body.errors]).toEqual([403, ['user.status.notApproved']]);
      expect((await history()).status).toBe(401);
    });
  });
});
