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
import { renderInApp, renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'people-removal.e2e.example.com';
const MARK = 'e2eremoval';
// Wednesday 2026-10-14, 10:00 in Fortaleza: the classes and enrolment modules' clock.
const NOW = new Date('2026-10-14T13:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

describe('people removal (e2e)', () => {
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
    // Classes go first (their location and creator are restricted); enrolments, instructors, push tokens and
    // notifications cascade with the classes and the users.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function account(
    role: Role = 'student',
    status: Status = 'approved',
    name = 'Ana Rocha',
    extra: { removedAt?: Date; whatsappNumber?: string } = {},
  ) {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name,
        email: `${MARK}.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status,
        ...extra,
      },
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
  async function classWith(instructorIds: string[], fromNowHours: number) {
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

  const authed = <T extends request.Test>(accessToken: string | undefined, req: T) =>
    accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
  const remove = (accessToken: string | undefined, id: string) =>
    authed(accessToken, http().post(`/people/${id}/remove`));
  const restore = (accessToken: string | undefined, id: string) =>
    authed(accessToken, http().post(`/people/${id}/restore`));
  const listRemoved = (accessToken: string | undefined) => authed(accessToken, http().get('/people/removed'));
  const me = (accessToken: string) => authed(accessToken, http().get('/auth/me'));

  const statusOf = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id } })).status;
  const enrolmentStatus = async (id: string) =>
    (await prisma.enrolment.findUniqueOrThrow({ where: { id } })).status;
  const instructorsOf = async (classId: string) =>
    (await prisma.classInstructor.findMany({ where: { classId }, orderBy: { userId: 'asc' } })).map(
      (item) => item.userId,
    );
  const notificationsOf = (userIds: string[], type: string) =>
    prisma.notification.findMany({ where: { userId: { in: userIds }, type } });
  const directoryHas = async (accessToken: string, name: string) => {
    const response = await authed(accessToken, http().get('/people').query({ search: name }));
    return (response.body.items as { name: string }[]).some((item) => item.name === name);
  };

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

  describe('removes', () => {
    it('removes a student and an instructor, releasing their upcoming seats, requests and classes', async () => {
      const actor = await account('admin', 'approved', 'Rita Admin');
      const other = await account('admin', 'approved', 'Bia Admin');
      const student = await account('student', 'approved', 'Aluna Zzremovida Souza');
      const instructor = await account('instructor', 'approved', 'Ivo Zzremovido Lima');
      const upcoming = await classWith([], 22);
      const another = await classWith([], 46);
      const ended = await classWith([], -3);
      const seat = await seedEnrolment(upcoming, student.id, 'approved');
      const requested = await seedEnrolment(another, student.id, 'pending');
      const endedSeat = await seedEnrolment(ended, student.id, 'approved');
      const alone = await classWith([instructor.id], 30);
      const past = await classWith([instructor.id], -2);

      const removedStudent = await remove(actor.accessToken, student.id);
      const removedInstructor = await remove(actor.accessToken, instructor.id);

      expect(removedStudent.status).toBe(200);
      expect(removedStudent.body).toEqual({ id: student.id, status: 'removed' });
      expect(removedInstructor.status).toBe(200);
      expect(removedInstructor.body).toEqual({ id: instructor.id, status: 'removed' });
      expect(await enrolmentStatus(seat)).toBe('cancelled');
      expect(await enrolmentStatus(requested)).toBe('withdrawn');
      expect(await enrolmentStatus(endedSeat)).toBe('approved');
      expect(await instructorsOf(alone)).toEqual([]);
      expect(await instructorsOf(past)).toEqual([instructor.id]);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: student.id } });
      expect(stored.removedAt).toBeInstanceOf(Date);
      // Their sessions still work and read the new status; neither shows in the directory.
      expect((await me(student.accessToken)).body.status).toBe('removed');
      expect((await me(instructor.accessToken)).body.status).toBe('removed');
      expect(await directoryHas(actor.accessToken, 'Aluna Zzremovida Souza')).toBe(false);
      expect(await directoryHas(actor.accessToken, 'Ivo Zzremovido Lima')).toBe(false);
      // The class keeps its place, flagged without an instructor; the other admin hears of it, the actor does not.
      const detail = await authed(actor.accessToken, http().get(`/classes/${alone}`));
      expect(detail.status).toBe(200);
      expect(detail.body.instructors).toEqual([]);
      expect(await notificationsOf([other.id], 'class.noInstructor')).toHaveLength(1);
      expect(await notificationsOf([actor.id], 'class.noInstructor')).toEqual([]);
    });

    it('removes another admin and leaves the caller an approved admin', async () => {
      await setAsideOtherAdmins();
      const actor = await account('admin');
      const target = await account('admin');

      const response = await remove(actor.accessToken, target.id);

      expect(response.status).toBe(200);
      expect(await statusOf(target.id)).toBe('removed');
      expect(await prisma.user.count({ where: { role: 'admin', status: 'approved' } })).toBe(1);
    });
  });

  describe('refuses', () => {
    /** The refusal changed nothing: the target's status, its seat and no account.removed for anyone. */
    async function expectNothingChanged(target: { id: string }, status: Status, seat?: string) {
      expect(await statusOf(target.id)).toBe(status);
      if (seat) expect(await enrolmentStatus(seat)).toBe('approved');
      expect(
        await prisma.notification.count({
          where: { type: 'account.removed', user: { email: { endsWith: `@${DOMAIN}` } } },
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

      const response = await remove(caller.accessToken, student.id);

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
      await expectNothingChanged(student, 'approved', seat);
    });

    it.each<Role>(['student', 'instructor'])(
      'refuses an approved %s caller with 403 user.role.notAdmin',
      async (role) => {
        const caller = await account(role);
        const { student, seat } = await studentWithSeat();

        const response = await remove(caller.accessToken, student.id);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.role.notAdmin']);
        await expectNothingChanged(student, 'approved', seat);
      },
    );

    it.each([randomUUID(), 'not-a-uuid'])('refuses the unknown id %s with 404 user.notFound', async (id) => {
      const admin = await account('admin');
      const { student, seat } = await studentWithSeat();

      const response = await remove(admin.accessToken, id);

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual(['user.notFound']);
      await expectNothingChanged(student, 'approved', seat);
    });

    it("refuses the caller's own id with 403 user.remove.self", async () => {
      const admin = await account('admin');

      const response = await remove(admin.accessToken, admin.id);

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.remove.self']);
      await expectNothingChanged(admin, 'approved');
    });

    it.each(NOT_APPROVED)('refuses a %s target with 409 user.status.notApproved', async (status) => {
      const admin = await account('admin');
      const target = await account('student', status);

      const response = await remove(admin.accessToken, target.id);

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
      await expectNothingChanged(target, status);
    });

    it('refuses a request without a token with 401 auth.token.invalid', async () => {
      const { student, seat } = await studentWithSeat();

      const response = await remove(undefined, student.id);

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
      await expectNothingChanged(student, 'approved', seat);
    });
  });

  describe('last admin', () => {
    it('lets only one of two admins removing each other at once win, keeping one approved admin', async () => {
      await setAsideOtherAdmins();
      const a = await account('admin', 'approved', 'Rita Admin');
      const b = await account('admin', 'approved', 'Bia Admin');

      const [first, second] = await racing(2, () =>
        Promise.all([
          remove(a.accessToken, b.id).then((response) => response),
          remove(b.accessToken, a.id).then((response) => response),
        ]),
      );

      expect([first.status, second.status].sort((x, y) => x - y)).toEqual([200, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['user.role.lastAdmin']);
      expect(await prisma.user.count({ where: { role: 'admin', status: 'approved' } })).toBe(1);
      expect([await statusOf(a.id), await statusOf(b.id)].sort()).toEqual(['approved', 'removed']);
    });
  });

  describe('lists', () => {
    it('lists the removed accounts inside their window, most recent removal first', async () => {
      const admin = await account('admin');
      const now = Date.now();
      const r1 = await account('student', 'removed', 'Bia Souza', { removedAt: new Date(now - 2 * DAY) });
      const r2 = await account('instructor', 'removed', 'Caio Lima', { removedAt: new Date(now - HOUR) });
      const r3 = await account('student', 'removed', 'Duda Reis', { removedAt: new Date(now - 30 * DAY - 60_000) });
      const noDate = await account('student', 'removed', 'Eva Neri');
      const deleted = await account('student', 'deleted', 'Fabio Dias', { removedAt: new Date(now - HOUR) });
      const approved = await account('student', 'approved', 'Gil Rocha');
      const ours = [r1, r2, r3, noDate, deleted, approved].map((item) => item.id);

      const response = await listRemoved(admin.accessToken);

      expect(response.status).toBe(200);
      const items = (response.body.items as { id: string; removedAt: string }[]).filter((item) => ours.includes(item.id));
      expect(items).toEqual([
        { id: r2.id, name: 'Caio Lima', role: 'instructor', removedAt: expect.any(String) },
        { id: r1.id, name: 'Bia Souza', role: 'student', removedAt: expect.any(String) },
      ]);
      expect(new Date(items[0]!.removedAt).getTime()).toBeGreaterThan(new Date(items[1]!.removedAt).getTime());
    });

    it('lists accounts removed at the same moment by id', async () => {
      const admin = await account('admin');
      const removedAt = new Date(Date.now() - DAY);
      const a = await account('student', 'removed', 'Bia Souza', { removedAt });
      const b = await account('student', 'removed', 'Caio Lima', { removedAt });

      const response = await listRemoved(admin.accessToken);

      const ids = (response.body.items as { id: string }[]).map((item) => item.id).filter((id) => [a.id, b.id].includes(id));
      expect(ids).toEqual([a.id, b.id].sort());
    });

    it('is not taken as /people/:id, and refuses callers who are not approved admins', async () => {
      const student = await account('student');
      const pending = await account('admin', 'pending');

      const asStudent = await listRemoved(student.accessToken);
      const asPending = await listRemoved(pending.accessToken);
      const anonymous = await listRemoved(undefined);

      expect(asStudent.status).toBe(403);
      expect(asStudent.body.errors).toEqual(['user.role.notAdmin']);
      expect(asPending.status).toBe(403);
      expect(asPending.body.errors).toEqual(['user.status.notApproved']);
      expect(anonymous.status).toBe(401);
    });
  });

  describe('restores', () => {
    it('restores an instructor with their role, name and number, not back on the class they left', async () => {
      const admin = await account('admin');
      const instructor = await account('instructor', 'approved', 'Ivo Zzremovido Lima', {
        whatsappNumber: '+5585999990000',
      });
      const upcoming = await classWith([instructor.id], 22);
      await prisma.userRulesAcceptance.create({
        data: { userId: instructor.id, version: 1, acceptedAt: new Date(NOW.getTime() - 5 * DAY) },
      });
      expect((await remove(admin.accessToken, instructor.id)).status).toBe(200);

      const response = await restore(admin.accessToken, instructor.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: instructor.id, status: 'approved' });
      const profile = (await me(instructor.accessToken)).body;
      expect(profile).toMatchObject({
        status: 'approved',
        role: 'instructor',
        name: 'Ivo Zzremovido Lima',
        whatsappNumber: '+5585999990000',
        rulesAcceptedBefore: true,
      });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: instructor.id } })).removedAt).toBeNull();
      expect(await directoryHas(admin.accessToken, 'Ivo Zzremovido Lima')).toBe(true);
      const listed = await listRemoved(admin.accessToken);
      expect((listed.body.items as { id: string }[]).map((item) => item.id)).not.toContain(instructor.id);
      expect(await instructorsOf(upcoming)).toEqual([]);
    });

    it('keeps the seats a removed student gave up cancelled, and lets the account be removed and listed again', async () => {
      const admin = await account('admin');
      const student = await account('student');
      const seat = await seedEnrolment(await classWith([], 22), student.id, 'approved');
      expect((await remove(admin.accessToken, student.id)).status).toBe(200);
      const firstRemoval = (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).removedAt!;

      expect((await restore(admin.accessToken, student.id)).status).toBe(200);

      expect(await enrolmentStatus(seat)).toBe('cancelled');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect((await remove(admin.accessToken, student.id)).status).toBe(200);
      const secondRemoval = (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).removedAt!;
      expect(secondRemoval.getTime()).toBeGreaterThan(firstRemoval.getTime());
      const listed = await listRemoved(admin.accessToken);
      expect(
        (listed.body.items as { id: string; removedAt: string }[]).find((item) => item.id === student.id)?.removedAt,
      ).toBe(secondRemoval.toISOString());
    });
  });

  describe('refuses to restore', () => {
    it.each(NOT_APPROVED.filter((status) => status !== 'removed'))(
      'refuses a %s caller with 403 user.status.notApproved',
      async (status) => {
        const caller = await account('admin', status);
        const target = await account('student', 'removed', 'Bia Souza', { removedAt: new Date() });

        const response = await restore(caller.accessToken, target.id);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
        expect(await statusOf(target.id)).toBe('removed');
      },
    );

    it('refuses an approved non-admin caller with 403 user.role.notAdmin', async () => {
      const caller = await account('instructor');
      const target = await account('student', 'removed', 'Bia Souza', { removedAt: new Date() });

      const response = await restore(caller.accessToken, target.id);

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.role.notAdmin']);
    });

    it.each([randomUUID(), 'not-a-uuid'])('refuses the unknown id %s with 404 user.notFound', async (id) => {
      const admin = await account('admin');

      const response = await restore(admin.accessToken, id);

      expect(response.status).toBe(404);
      expect(response.body.errors).toEqual(['user.notFound']);
    });

    it.each<Status>(['approved', 'pending', 'denied', 'deleted'])(
      'refuses a %s target with 409 user.status.notRemoved',
      async (status) => {
        const admin = await account('admin');
        const target = await account('student', status);

        const response = await restore(admin.accessToken, target.id);

        expect(response.status).toBe(409);
        expect(response.body.errors).toEqual(['user.status.notRemoved']);
        expect(await statusOf(target.id)).toBe(status);
      },
    );

    it.each([
      ['30 days ago', new Date(Date.now() - 30 * DAY - 1000)],
      ['with no date', undefined],
    ])('refuses an account removed %s with 409 removal.window.ended', async (_label, removedAt) => {
      const admin = await account('admin');
      const target = await account('student', 'removed', 'Bia Souza', removedAt ? { removedAt } : {});

      const response = await restore(admin.accessToken, target.id);

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['removal.window.ended']);
      expect(await statusOf(target.id)).toBe('removed');
    });

    it('lets only one of two restores at the same moment win, and tells the person once', async () => {
      const a = await account('admin');
      const b = await account('admin');
      const target = await account('student', 'removed', 'Bia Souza', { removedAt: new Date(Date.now() - DAY) });

      const [first, second] = await Promise.all([
        restore(a.accessToken, target.id).then((response) => response),
        restore(b.accessToken, target.id).then((response) => response),
      ]);

      expect([first.status, second.status].sort((x, y) => x - y)).toEqual([200, 409]);
      const refused = first.status === 409 ? first : second;
      expect(refused.body.errors).toEqual(['user.status.notRemoved']);
      expect(await statusOf(target.id)).toBe('approved');
      expect(await notificationsOf([target.id], 'account.restored')).toHaveLength(1);
    });
  });

  describe('notifies', () => {
    async function pushedTo(userId: string) {
      const stored = await prisma.pushToken.findMany({ where: { userId } });
      return push.sent.filter((message) => stored.some((item) => item.token === message.token));
    }

    it('tells the person of the removal and of the restore, in the language of their phone', async () => {
      const admin = await account('admin');
      const student = await account('student');
      await pushTokenFor(student.id, 'pt-BR');
      await pushTokenFor(admin.id, 'pt-BR');

      expect((await remove(admin.accessToken, student.id)).status).toBe(200);
      expect((await restore(admin.accessToken, student.id)).status).toBe(200);

      expect((await notificationsOf([student.id], 'account.removed')).map((item) => item.params)).toEqual([{}]);
      expect((await notificationsOf([student.id], 'account.restored')).map((item) => item.params)).toEqual([{}]);
      const sent = await pushedTo(student.id);
      expect(sent.map((message) => message.type)).toEqual(['account.removed', 'account.restored']);
      expect(renderPush('account.removed', sent[0]!.params, 'pt-BR')).toEqual({
        title: 'Acesso removido',
        body: 'Um admin removeu seu acesso à escola.',
      });
      expect(renderPush('account.restored', sent[1]!.params, 'pt-BR')).toEqual({
        title: 'Acesso restaurado',
        body: 'Sua conta está de volta, com seu histórico e seu papel.',
      });
      // The notifications of the person list both with that text.
      const list = await authed(student.accessToken, http().get('/notifications').query({ locale: 'pt-BR' }));
      expect(list.status).toBe(200);
      const texts = (list.body.items as { type: string; title: string; body: string }[])
        .filter((item) => item.type.startsWith('account.'))
        .map(({ type, title, body }) => ({ type, title, body }))
        .sort((x, y) => x.type.localeCompare(y.type));
      expect(texts).toEqual([
        { type: 'account.removed', ...renderInApp('account.removed', {}, 'pt-BR') },
        { type: 'account.restored', ...renderInApp('account.restored', {}, 'pt-BR') },
      ]);
      // The acting admin is told of neither.
      expect(await notificationsOf([admin.id], 'account.removed')).toEqual([]);
      expect(await notificationsOf([admin.id], 'account.restored')).toEqual([]);
    });

    it('notifies nobody on a refused removal or restore', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');
      const approved = await account('student');

      expect((await remove(admin.accessToken, pending.id)).status).toBe(409);
      expect((await restore(admin.accessToken, approved.id)).status).toBe(409);

      expect(
        await prisma.notification.count({
          where: {
            type: { in: ['account.removed', 'account.restored'] },
            user: { email: { endsWith: `@${DOMAIN}` } },
          },
        }),
      ).toBe(0);
    });

    it('answers 200 and keeps the stored notification when the push fails', async () => {
      const admin = await account('admin');
      const student = await account('student');
      await pushTokenFor(student.id);
      push.failWith = new Error('expo down');

      const response = await remove(admin.accessToken, student.id);

      expect(response.status).toBe(200);
      expect(await statusOf(student.id)).toBe('removed');
      expect(await notificationsOf([student.id], 'account.removed')).toHaveLength(1);
    });
  });

  describe('registers', () => {
    const register = (accessToken: string, body: object) =>
      authed(accessToken, http().put('/notifications/push-token')).send(body);

    it('stores the push token of a removed account, and still refuses a denied one', async () => {
      const removed = await account('student', 'removed', 'Bia Souza', { removedAt: new Date() });
      const denied = await account('student', 'denied');
      const token = `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`;

      const accepted = await register(removed.accessToken, { token, locale: 'pt-BR' });
      const refused = await register(denied.accessToken, { token: `${token}x`, locale: 'pt-BR' });

      expect(accepted.status).toBe(204);
      expect(await prisma.pushToken.count({ where: { userId: removed.id, token } })).toBe(1);
      expect(refused.status).toBe(403);
      expect(refused.body.errors).toEqual(['pushToken.status.notAllowed']);
    });
  });
});
