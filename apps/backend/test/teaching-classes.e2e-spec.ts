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

const DOMAIN = 'teaching-classes.e2e.example.com';
const MARK = 'e2eteaching';
// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date('2026-10-14T13:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

interface Account {
  id: string;
  accessToken: string;
}

describe('Teaching classes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let locationId: string;
  let creator: Account;

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
    creator = await account('admin');
  });

  afterEach(async () => {
    // The classes go first (their instructors and guests cascade), then the location and the users.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const teaching = (token?: string) => {
    const req = http().get('/classes/teaching');
    return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  };
  const ids = (response: request.Response) => response.body.items.map((item: { id: string }) => item.id);

  async function account(role: Role = 'instructor', status: Status = 'approved'): Promise<Account> {
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

  /** A one-hour class starting `offsetMs` from now, taught by `instructorIds`. */
  async function makeClass(
    offsetMs: number,
    instructorIds: string[],
    options: { cancelled?: boolean; id?: string } = {},
  ): Promise<string> {
    const id = options.id ?? randomUUID();
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
        createdBy: creator.id,
        cancelledAt: options.cancelled ? new Date(NOW.getTime() - DAY) : null,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
    return id;
  }

  describe('lists the classes the caller teaches', () => {
    it.each(['instructor', 'admin'] as const)(
      'answers an approved %s the classes that have not ended, by start, cancelled ones included',
      async (role) => {
        const teacher = await account(role);
        const someoneElse = await account('instructor');
        await makeClass(-DAY, [teacher.id]);
        const underWay = await makeClass(-HOUR / 2, [teacher.id]);
        const cancelled = await makeClass(DAY, [teacher.id], { cancelled: true });
        const nextWeek = await makeClass(7 * DAY, [teacher.id]);
        await makeClass(2 * DAY, [someoneElse.id]);
        await prisma.guest.create({ data: { id: randomUUID(), classId: underWay, name: 'Carolina' } });

        const response = await teaching(teacher.accessToken);

        expect(response.status).toBe(200);
        expect(ids(response)).toEqual([underWay, cancelled, nextWeek]);
        expect(response.body.teachesAny).toBe(true);
        expect(response.body.items[0]).toMatchObject({
          myEnrolment: null,
          seatsTaken: 1,
          guests: [{ name: 'Carolina' }],
          instructors: [{ id: teacher.id }],
        });
        expect(response.body.items[1].cancelledAt).not.toBeNull();
      },
    );

    it('orders classes starting together by id', async () => {
      const teacher = await account();
      const later = await makeClass(DAY, [teacher.id], { id: 'ffffffff-0000-4000-8000-000000000000' });
      const earlier = await makeClass(DAY, [teacher.id], { id: '00000000-0000-4000-8000-0000000000aa' });

      expect(ids(await teaching(teacher.accessToken))).toEqual([earlier, later]);
    });

    it('leaves out a class ending exactly now and keeps one taught with someone else', async () => {
      const teacher = await account();
      await makeClass(-HOUR, [teacher.id]);
      const shared = await makeClass(DAY, [(await account()).id, teacher.id]);

      const response = await teaching(teacher.accessToken);

      expect(ids(response)).toEqual([shared]);
      expect(response.body.items[0].instructors).toHaveLength(2);
    });
  });

  describe('teachesAny', () => {
    it('is false for an admin or instructor who teaches no class', async () => {
      for (const role of ['admin', 'instructor'] as const) {
        const response = await teaching((await account(role)).accessToken);
        expect([response.status, response.body]).toEqual([200, { items: [], teachesAny: false }]);
      }
    });

    it('is true for an admin whose only class has ended', async () => {
      const admin = await account('admin');
      await makeClass(-DAY, [admin.id]);

      const response = await teaching(admin.accessToken);

      expect([response.status, response.body]).toEqual([200, { items: [], teachesAny: true }]);
    });

    it("is true, with the class listed, for an admin whose only class is cancelled and hasn't ended", async () => {
      const admin = await account('admin');
      const cancelled = await makeClass(DAY, [admin.id], { cancelled: true });

      const response = await teaching(admin.accessToken);

      expect([ids(response), response.body.teachesAny]).toEqual([[cancelled], true]);
    });

    it("turns false once the admin's only class is deleted", async () => {
      const admin = await account('admin');
      const only = await makeClass(DAY, [admin.id]);
      expect((await teaching(admin.accessToken)).body.teachesAny).toBe(true);

      await prisma.schoolClass.delete({ where: { id: only } });

      expect((await teaching(admin.accessToken)).body).toEqual({ items: [], teachesAny: false });
    });
  });

  describe('access', () => {
    it('refuses a student with 403 user.role.notTeacher', async () => {
      const response = await teaching((await account('student')).accessToken);

      expect([response.status, response.body.errors]).toEqual([403, ['user.role.notTeacher']]);
    });

    it('refuses a pending instructor with 403 user.status.notApproved', async () => {
      const response = await teaching((await account('instructor', 'pending')).accessToken);

      expect([response.status, response.body.errors]).toEqual([403, ['user.status.notApproved']]);
    });

    it('refuses a request without a token with 401', async () => {
      expect((await teaching()).status).toBe(401);
    });
  });
});
