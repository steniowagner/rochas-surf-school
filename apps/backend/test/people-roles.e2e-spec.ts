import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PushMessage, PushReceipt, PushSendTicket } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { SystemClockProvider as EnrolmentClockProvider } from '../src/modules/enrolment/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'people-roles.e2e.example.com';
const MARK = 'e2eroles';
// Wednesday 2026-10-14, 10:00 in Fortaleza: the classes and enrolment modules' clock.
const NOW = new Date('2026-10-14T13:00:00.000Z');
const HOUR = 60 * 60 * 1000;

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

/** Records the pushes instead of calling Expo; fails every send when `failWith` is set. */
class FakePushProvider {
  readonly sent: PushMessage[] = [];
  failWith: Error | null = null;

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    if (this.failWith) throw this.failWith;
    this.sent.push(...messages);
    return messages.map(() => ({ status: 'ok', id: `ticket-${randomUUID()}` }));
  }

  async getReceipts(): Promise<Record<string, PushReceipt>> {
    return {};
  }
}

describe('PUT /people/:id/role (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let locationId: string;
  let creatorId: string;
  let classIds: string[];
  // The database is shared: the approved admins that aren't the test's are set aside (made instructors) by the tests
  // that need an exact number of admins, and put back after every test.
  let setAside: string[];

  beforeEach(async () => {
    push = new FakePushProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(ClassesClockProvider)
      .useValue({ now: () => new Date(NOW.getTime()) })
      .overrideProvider(EnrolmentClockProvider)
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
    classIds = [];
    setAside = [];
    // The classes' creator is a closed account, so it never counts as an admin nor gets a notification.
    creatorId = (await account('instructor', 'deleted', 'Carla Lima')).id;
  });

  afterEach(async () => {
    if (setAside.length > 0) {
      await prisma.$executeRaw`UPDATE users SET role = 'admin' WHERE id = ANY(${setAside}::uuid[])`;
    }
    // The approved admins already in the database may have been told about the test's classes too.
    if (classIds.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          type: { in: ['class.noInstructor', 'enrolment.cancelled'] },
          OR: classIds.map((id) => ({ params: { path: ['classId'], equals: id } })),
        },
      });
    }
    // Classes go first (their location and creator are restricted); enrolments, instructors and notifications
    // cascade with the classes and the users.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function account(role: Role = 'student', status: Status = 'approved', name = 'Ana Rocha') {
    const user = await prisma.user.create({
      data: { id: randomUUID(), name, email: `${MARK}.${randomUUID().slice(0, 8)}@${DOMAIN}`, role, status },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  /** Makes the test's admins the only approved admins of the school until the test ends. */
  async function setAsideOtherAdmins() {
    const others = await prisma.user.findMany({
      where: { role: 'admin', status: 'approved', NOT: { email: { endsWith: `@${DOMAIN}` } } },
      select: { id: true },
    });
    setAside = others.map((item) => item.id);
    if (setAside.length > 0) {
      await prisma.$executeRaw`UPDATE users SET role = 'instructor' WHERE id = ANY(${setAside}::uuid[])`;
    }
  }

  /** A class starting `fromNowHours` after the clock, one hour long. */
  async function classWith(instructorIds: string[], fromNowHours: number, cancelledAt?: Date) {
    const startsAt = new Date(NOW.getTime() + fromNowHours * HOUR);
    const created = await prisma.schoolClass.create({
      data: {
        id: randomUUID(),
        discipline: 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        locationId,
        capacity: 8,
        createdBy: creatorId,
        cancelledAt: cancelledAt ?? null,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
    classIds.push(created.id);
    return created.id;
  }

  async function seedEnrolment(classId: string, studentId: string, status: 'pending' | 'approved') {
    const id = randomUUID();
    await prisma.enrolment.create({
      data: { id, classId, studentId, status, requestedAt: new Date(NOW.getTime() - 24 * HOUR) },
    });
    return id;
  }

  async function pushTokenFor(userId: string, locale = 'pt-BR') {
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId, locale },
    });
  }

  const changeRole = (accessToken: string | undefined, id: string, body?: unknown) => {
    const req = http().put(`/people/${id}/role`);
    const authed = accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
    return body === undefined ? authed : authed.send(body as object);
  };

  const roleOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).role;
  const statusOf = async (id: string) => (await prisma.enrolment.findUniqueOrThrow({ where: { id } })).status;
  const instructorsOf = async (classId: string) =>
    (await prisma.classInstructor.findMany({ where: { classId }, orderBy: { userId: 'asc' } })).map(
      (item) => item.userId,
    );
  const notificationsOf = (userIds: string[], type: string) =>
    prisma.notification.findMany({ where: { userId: { in: userIds }, type } });

  /**
   * Holds the approved admins' rows locked while `run` sends its requests, and lets go only once `waiting` of them
   * are blocked on the lock, so they reach the guarded write together: a real race, every time.
   */
  async function racing<T>(waiting: number, run: () => Promise<T>): Promise<T> {
    let pending!: Promise<T>;
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE role = 'admin' AND status = 'approved' FOR UPDATE`;
        pending = run();
        const deadline = Date.now() + 10_000;
        for (;;) {
          const [{ blocked }] = await prisma.$queryRaw<{ blocked: number }[]>(Prisma.sql`
            SELECT count(*)::int AS blocked FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%FOR UPDATE%'`);
          if (blocked >= waiting) break;
          if (Date.now() > deadline) throw new Error(`only ${blocked} of ${waiting} requests reached the lock`);
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      },
      { timeout: 15_000 },
    );
    return pending;
  }

  describe('promotes a student to instructor', () => {
    it('releases the upcoming seat and the request, keeping the seat of a class that started', async () => {
      const admin = await account('admin', 'approved', 'Rita Admin');
      const student = await account('student', 'approved', 'Ana Souza');
      const upcoming = await classWith([], 22);
      const another = await classWith([], 46);
      const started = await classWith([], -0.5);
      const seat = await seedEnrolment(upcoming, student.id, 'approved');
      const requested = await seedEnrolment(another, student.id, 'pending');
      const underWay = await seedEnrolment(started, student.id, 'approved');

      const response = await changeRole(admin.accessToken, student.id, { role: 'instructor' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: student.id, role: 'instructor' });
      expect(await roleOf(student.id)).toBe('instructor');
      expect(await statusOf(seat)).toBe('cancelled');
      expect(await statusOf(requested)).toBe('withdrawn');
      expect(await statusOf(underWay)).toBe('approved');
      // As for an account deletion, the school is told about the cancelled seat.
      const cancelled = await notificationsOf([admin.id], 'enrolment.cancelled');
      expect(cancelled.map((item) => (item.params as { classId: string }).classId)).toEqual([upcoming]);
    });

    it('promotes a student with no seats or requests the same way', async () => {
      const admin = await account('admin');
      const student = await account('student');

      const response = await changeRole(admin.accessToken, student.id, { role: 'instructor' });

      expect(response.status).toBe(200);
      expect(await roleOf(student.id)).toBe('instructor');
    });
  });

  describe('promotes to admin', () => {
    it("releases a student's seats and requests", async () => {
      const admin = await account('admin');
      const student = await account('student');
      const upcoming = await classWith([], 22);
      const seat = await seedEnrolment(upcoming, student.id, 'approved');
      const requested = await seedEnrolment(await classWith([], 46), student.id, 'pending');

      const response = await changeRole(admin.accessToken, student.id, { role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: student.id, role: 'admin' });
      expect(await roleOf(student.id)).toBe('admin');
      expect(await statusOf(seat)).toBe('cancelled');
      expect(await statusOf(requested)).toBe('withdrawn');
    });

    it('keeps an instructor on the classes they teach', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      const upcoming = await classWith([instructor.id], 22);

      const response = await changeRole(admin.accessToken, instructor.id, { role: 'admin' });

      expect(response.status).toBe(200);
      expect(await roleOf(instructor.id)).toBe('admin');
      expect(await instructorsOf(upcoming)).toEqual([instructor.id]);
    });
  });

  describe('demotes an instructor', () => {
    it('takes them off the upcoming classes only and tells the other admins, not the actor', async () => {
      const actor = await account('admin', 'approved', 'Rita Admin');
      const other = await account('admin', 'approved', 'Bia Admin');
      const instructor = await account('instructor');
      const coInstructor = await account('instructor');
      const alone = await classWith([instructor.id], 22);
      const shared = await classWith([instructor.id, coInstructor.id], 46);
      const started = await classWith([instructor.id], -0.5);
      const cancelled = await classWith([instructor.id], 30, new Date(NOW.getTime() - HOUR));

      const response = await changeRole(actor.accessToken, instructor.id, { role: 'student' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: instructor.id, role: 'student' });
      expect(await roleOf(instructor.id)).toBe('student');
      expect(await instructorsOf(alone)).toEqual([]);
      expect(await instructorsOf(shared)).toEqual([coInstructor.id]);
      expect(await instructorsOf(started)).toEqual([instructor.id]);
      expect(await instructorsOf(cancelled)).toEqual([instructor.id]);
      // The class keeps its place in the schedule, flagged: no instructor and not started.
      const detail = await http().get(`/classes/${alone}`).set('Authorization', `Bearer ${actor.accessToken}`);
      expect(detail.status).toBe(200);
      expect(detail.body.instructors).toEqual([]);
      expect(await notificationsOf([other.id], 'class.noInstructor')).toHaveLength(1);
      expect(await notificationsOf([actor.id], 'class.noInstructor')).toEqual([]);
    });

    it('demotes an instructor with no upcoming classes, telling nobody about classes', async () => {
      const actor = await account('admin');
      const other = await account('admin');
      const instructor = await account('instructor');

      expect((await changeRole(actor.accessToken, instructor.id, { role: 'student' })).status).toBe(200);

      expect(await roleOf(instructor.id)).toBe('student');
      expect(await notificationsOf([other.id, actor.id], 'class.noInstructor')).toEqual([]);
    });
  });

  describe('admin to instructor', () => {
    it("keeps the admin's classes and takes away the admin routes at once", async () => {
      const actor = await account('admin');
      const target = await account('admin');
      const upcoming = await classWith([target.id], 22);

      const response = await changeRole(actor.accessToken, target.id, { role: 'instructor' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: target.id, role: 'instructor' });
      expect(await roleOf(target.id)).toBe('instructor');
      expect(await instructorsOf(upcoming)).toEqual([target.id]);
      const registrations = await http()
        .get('/registrations')
        .set('Authorization', `Bearer ${target.accessToken}`);
      expect(registrations.status).toBe(403);
      expect(registrations.body.errors).toEqual(['user.role.notAdmin']);
    });
  });

  describe('refuses', () => {
    /** The refusal changed nothing: the target's role, their seat and no role.changed for anyone. */
    async function expectNothingChanged(target: { id: string }, role: Role, seat: string) {
      expect(await roleOf(target.id)).toBe(role);
      expect(await statusOf(seat)).toBe('approved');
      expect(
        await prisma.notification.count({
          where: { type: 'role.changed', user: { email: { endsWith: `@${DOMAIN}` } } },
        }),
      ).toBe(0);
    }

    async function studentWithSeat() {
      const student = await account('student');
      const seat = await seedEnrolment(await classWith([], 22), student.id, 'approved');
      return { student, seat };
    }

    it.each(NOT_APPROVED)('refuses a %s caller with 403 user.status.notApproved', async (status) => {
      const caller = await account('admin', status);
      const { student, seat } = await studentWithSeat();

      const response = await changeRole(caller.accessToken, student.id, { role: 'instructor' });

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
      await expectNothingChanged(student, 'student', seat);
    });

    it.each<Role>(['student', 'instructor'])(
      'refuses an approved %s caller with 403 user.role.notAdmin, before the role',
      async (role) => {
        const caller = await account(role);
        const { student, seat } = await studentWithSeat();

        const response = await changeRole(caller.accessToken, student.id, { role: 'boss' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.role.notAdmin']);
        await expectNothingChanged(student, 'student', seat);
      },
    );

    it.each([undefined, {}, { role: 7 }, { role: 'boss' }])(
      'refuses the body %p with 422 people.role.invalid',
      async (body) => {
        const admin = await account('admin');
        const { student, seat } = await studentWithSeat();

        const response = await changeRole(admin.accessToken, student.id, body);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['people.role.invalid']);
        await expectNothingChanged(student, 'student', seat);
      },
    );

    it.each([randomUUID(), 'not-a-uuid'])('refuses the unknown id %s with 404 user.notFound', async (id) => {
      const admin = await account('admin');
      const { student, seat } = await studentWithSeat();

      const response = await changeRole(admin.accessToken, id, { role: 'instructor' });

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual(['user.notFound']);
      await expectNothingChanged(student, 'student', seat);
    });

    it("refuses the caller's own id with 403 user.role.self", async () => {
      const admin = await account('admin');
      const { student, seat } = await studentWithSeat();

      const response = await changeRole(admin.accessToken, admin.id, { role: 'instructor' });

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.role.self']);
      expect(await roleOf(admin.id)).toBe('admin');
      await expectNothingChanged(student, 'student', seat);
    });

    it.each(NOT_APPROVED)('refuses a %s target with 409 user.status.notApproved', async (status) => {
      const admin = await account('admin');
      const target = await account('student', status);
      const seat = await seedEnrolment(await classWith([], 22), target.id, 'approved');

      const response = await changeRole(admin.accessToken, target.id, { role: 'instructor' });

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
      await expectNothingChanged(target, 'student', seat);
    });

    it.each<[Role, Role]>([
      ['admin', 'student'],
      ['admin', 'admin'],
      ['instructor', 'instructor'],
      ['student', 'student'],
    ])('refuses %s → %s with 409 user.role.changeNotAllowed', async (from, to) => {
      const admin = await account('admin');
      const target = await account(from);
      const seat = await seedEnrolment(await classWith([], 22), target.id, 'approved');

      const response = await changeRole(admin.accessToken, target.id, { role: to });

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['user.role.changeNotAllowed']);
      await expectNothingChanged(target, from, seat);
    });

    it('refuses a request without a token with 401 auth.token.invalid', async () => {
      const { student, seat } = await studentWithSeat();

      const response = await changeRole(undefined, student.id, { role: 'instructor' });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
      await expectNothingChanged(student, 'student', seat);
    });
  });

  describe('last admin', () => {
    it('lets only one of two admins demoting each other at once win, keeping one approved admin', async () => {
      await setAsideOtherAdmins();
      const a = await account('admin', 'approved', 'Rita Admin');
      const b = await account('admin', 'approved', 'Bia Admin');

      const [first, second] = await racing(2, () =>
        Promise.all([
          changeRole(a.accessToken, b.id, { role: 'instructor' }).then((response) => response),
          changeRole(b.accessToken, a.id, { role: 'instructor' }).then((response) => response),
        ]),
      );

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['user.role.lastAdmin']);
      expect(await prisma.user.count({ where: { role: 'admin', status: 'approved' } })).toBe(1);
      expect([await roleOf(a.id), await roleOf(b.id)].sort()).toEqual(['admin', 'instructor']);
    });

    it('refuses a change made meanwhile by another admin with 409 user.role.changeNotAllowed', async () => {
      const a = await account('admin');
      const b = await account('admin');
      const student = await account('student');

      const [first, second] = await racing(2, () =>
        Promise.all([
          changeRole(a.accessToken, student.id, { role: 'instructor' }).then((response) => response),
          changeRole(b.accessToken, student.id, { role: 'instructor' }).then((response) => response),
        ]),
      );

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['user.role.changeNotAllowed']);
      expect(await roleOf(student.id)).toBe('instructor');
      expect(await notificationsOf([student.id], 'role.changed')).toHaveLength(1);
    });
  });

  describe('notifies', () => {
    async function pushedTo(userId: string) {
      const tokens = await prisma.pushToken.findMany({ where: { userId } });
      return push.sent.filter((message) => tokens.some((token) => token.token === message.token));
    }

    it('tells a promoted student of the new role and the seats given up, in the language of their phone', async () => {
      const admin = await account('admin');
      const student = await account('student');
      await pushTokenFor(student.id, 'pt-BR');
      await pushTokenFor(admin.id, 'pt-BR');
      await seedEnrolment(await classWith([], 22), student.id, 'approved');

      expect((await changeRole(admin.accessToken, student.id, { role: 'instructor' })).status).toBe(200);

      const stored = await notificationsOf([student.id], 'role.changed');
      expect(stored.map((item) => item.params)).toEqual([
        { role: 'instructor', seatsReleased: true, classesReleased: false },
      ]);
      const sent = await pushedTo(student.id);
      expect(sent).toHaveLength(1);
      expect(renderPush('role.changed', sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Seu papel mudou',
        body: 'Agora você é instrutor. Suas vagas e pedidos em aulas futuras foram cancelados.',
      });
      expect(await notificationsOf([admin.id], 'role.changed')).toEqual([]);
      expect((await pushedTo(admin.id)).filter((message) => message.type === 'role.changed')).toEqual([]);
    });

    it('tells a demoted instructor they left their classes, sending no class.unassigned', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      await pushTokenFor(instructor.id, 'pt-BR');
      await classWith([instructor.id], 22);

      expect((await changeRole(admin.accessToken, instructor.id, { role: 'student' })).status).toBe(200);

      const sent = await pushedTo(instructor.id);
      expect(sent.map((message) => message.type)).toEqual(['role.changed']);
      expect(renderPush('role.changed', sent[0]!.params, 'pt-BR').body).toBe(
        'Agora você é aluno. Você saiu das suas próximas aulas.',
      );
      expect(await notificationsOf([instructor.id], 'class.unassigned')).toEqual([]);
    });

    it('tells a promoted instructor only of the new role', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor');
      await pushTokenFor(instructor.id, 'pt-BR');
      await classWith([instructor.id], 22);

      expect((await changeRole(admin.accessToken, instructor.id, { role: 'admin' })).status).toBe(200);

      const sent = await pushedTo(instructor.id);
      expect(sent).toHaveLength(1);
      expect(renderPush('role.changed', sent[0]!.params, 'pt-BR').body).toBe('Agora você é admin.');
    });

    it('answers 200 and keeps the stored notification when the push fails', async () => {
      const admin = await account('admin');
      const student = await account('student');
      await pushTokenFor(student.id);
      push.failWith = new Error('expo down');

      const response = await changeRole(admin.accessToken, student.id, { role: 'instructor' });

      expect(response.status).toBe(200);
      expect(await roleOf(student.id)).toBe('instructor');
      expect(await notificationsOf([student.id], 'role.changed')).toHaveLength(1);
    });
  });
});
