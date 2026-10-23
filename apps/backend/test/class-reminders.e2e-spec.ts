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
import { ClassReminderJob } from '../src/modules/classes/class-reminder.job.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'class-reminders.e2e.example.com';
const MARK = 'e2eremind';
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
// Thursday 2037-10-15, 08:00 in Fortaleza: far from any real class, so the job only meets this suite's classes.
const STARTS_AT = new Date('2037-10-15T11:00:00.000Z');
/** The instant `HH:mm` of 2037-10-15 in Fortaleza (UTC-3). */
const at = (time: string) => new Date(`2037-10-15T${time}:00.000-03:00`);

type Role = 'student' | 'instructor' | 'admin';
type EnrolmentStatus = 'pending' | 'approved' | 'denied' | 'withdrawn' | 'cancelled' | 'takenOut';

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

describe('Class reminders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let now: Date;
  let locationId: string;
  let locationName: string;
  let admin: Account;

  beforeEach(async () => {
    push = new FakePushProvider();
    now = at('07:30');
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ExpoPushProvider)
      .useValue(push)
      .overrideProvider(ClassesClockProvider)
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
    admin = await account('admin');
  });

  afterEach(async () => {
    // The classes go first (their enrolments, guests and instructors cascade), then the location and the users, whose
    // notifications and push tokens cascade.
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const runJob = () => app.get(ClassReminderJob).run();

  async function account(role: Role = 'student'): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status: 'approved',
      },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  /** A one-hour class taught by `instructorIds`. */
  async function makeClass(
    instructorIds: string[],
    options: { startsAt?: Date; cancelledAt?: Date } = {},
  ): Promise<string> {
    const id = randomUUID();
    const startsAt = options.startsAt ?? STARTS_AT;
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
        cancelledAt: options.cancelledAt ?? null,
        instructors: { create: instructorIds.map((userId) => ({ userId })) },
      },
    });
    return id;
  }

  async function enrol(classId: string, studentId: string, status: EnrolmentStatus): Promise<void> {
    await prisma.enrolment.create({
      data: { id: randomUUID(), classId, studentId, status, requestedAt: at('06:00') },
    });
  }

  /** The `class.reminder` notifications stored for each person, as their params. */
  async function reminders(...userIds: string[]): Promise<unknown[][]> {
    const stored = await prisma.notification.findMany({
      where: { userId: { in: userIds }, type: 'class.reminder' },
      orderBy: { createdAt: 'asc' },
    });
    return userIds.map((userId) => stored.filter((item) => item.userId === userId).map((item) => item.params));
  }

  const paramsOf = (classId: string, startsAt = STARTS_AT) => ({
    classId,
    discipline: 'surf',
    startsAt: startsAt.toISOString(),
    locationName,
  });

  describe('reminds seats and instructors', () => {
    it('reminds the approved students and every instructor once, and never pending requests or guests', async () => {
      const s1 = await account();
      const s2 = await account();
      const i1 = await account('instructor');
      const a1 = await account('admin');
      const classId = await makeClass([i1.id, a1.id]);
      await enrol(classId, s1.id, 'approved');
      await enrol(classId, s2.id, 'pending');
      await prisma.guest.create({ data: { id: randomUUID(), classId, name: 'Gabi', createdBy: admin.id } });
      await prisma.pushToken.create({ data: { token: `ExpoPushToken[${randomUUID()}]`, userId: s1.id, locale: 'pt-BR' } });

      await expect(runJob()).resolves.toMatchObject({ reminded: expect.any(Number) });

      const params = paramsOf(classId);
      expect(await reminders(s1.id, i1.id, a1.id, s2.id)).toEqual([[params], [params], [params], []]);
      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toEqual(now);
      // Only S1 has a phone with pushes on; the others still have the stored notification.
      expect(push.sent.filter((message) => message.type === 'class.reminder')).toEqual([
        expect.objectContaining({ locale: 'pt-BR', type: 'class.reminder', params }),
      ]);
    });

    it('stores nothing a minute before the window opens', async () => {
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      now = at('07:29');

      await runJob();

      expect(await reminders(i1.id)).toEqual([[]]);
      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toBeNull();
    });

    it('reminds a class created inside the window at the next run', async () => {
      const i1 = await account('instructor');
      now = at('07:45');
      const classId = await makeClass([i1.id]);
      now = at('07:46');

      await runJob();

      expect(await reminders(i1.id)).toEqual([[paramsOf(classId)]]);
    });

    it('never reminds a student whose enrolment was withdrawn, denied, cancelled or taken out', async () => {
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      const students = await Promise.all([account(), account(), account(), account()]);
      const statuses: EnrolmentStatus[] = ['withdrawn', 'denied', 'cancelled', 'takenOut'];
      for (const [index, student] of students.entries()) {
        await enrol(classId, student.id, statuses[index]!);
      }

      await runJob();

      expect(await reminders(...students.map((student) => student.id))).toEqual([[], [], [], []]);
      expect(await reminders(i1.id)).toEqual([[paramsOf(classId)]]);
    });
  });

  describe('only once', () => {
    it('stores no further reminder at 07:31 and 07:45', async () => {
      const s1 = await account();
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await enrol(classId, s1.id, 'approved');

      await runJob();
      now = at('07:31');
      await runJob();
      now = at('07:45');
      await runJob();

      expect(await reminders(s1.id, i1.id)).toEqual([[paramsOf(classId)], [paramsOf(classId)]]);
    });

    it('stores one reminder per person when two runs happen at the same moment', async () => {
      const s1 = await account();
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await enrol(classId, s1.id, 'approved');

      await Promise.all([runJob(), runJob()]);

      expect(await reminders(s1.id, i1.id)).toEqual([[paramsOf(classId)], [paramsOf(classId)]]);
    });

    it('keeps the class marked and the notifications stored when the push fails, and sends nothing again', async () => {
      const s1 = await account();
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await enrol(classId, s1.id, 'approved');
      await prisma.pushToken.create({ data: { token: `ExpoPushToken[${randomUUID()}]`, userId: s1.id, locale: 'en' } });
      push.failing = true;

      await expect(runJob()).resolves.toBeDefined();

      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toEqual(now);
      expect(await reminders(s1.id, i1.id)).toEqual([[paramsOf(classId)], [paramsOf(classId)]]);

      push.failing = false;
      push.sent = [];
      now = at('07:31');
      await runJob();

      expect(push.sent.filter((message) => message.params.classId === classId)).toEqual([]);
      expect(await reminders(s1.id)).toEqual([[paramsOf(classId)]]);
    });
  });

  describe('cancelled and started', () => {
    it('never reminds a cancelled class', async () => {
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id], { cancelledAt: at('06:00') });

      await runJob();

      expect(await reminders(i1.id)).toEqual([[]]);
      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toBeNull();
    });

    it.each(['08:00', '08:10'])('never reminds a class that started without one, at %s', async (time) => {
      const i1 = await account('instructor');
      await makeClass([i1.id]);
      now = at(time);

      await runJob();

      expect(await reminders(i1.id)).toEqual([[]]);
    });

    it('sends no second reminder to a class cancelled after its reminder', async () => {
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await runJob();
      const cancelled = await http()
        .post(`/classes/${classId}/cancel`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({});
      now = at('07:40');

      await runJob();

      expect(cancelled.status).toBe(200);
      expect(await reminders(i1.id)).toEqual([[paramsOf(classId)]]);
    });
  });

  describe('start moved', () => {
    const edit = (classId: string, instructorIds: string[], change: Record<string, unknown>) =>
      http()
        .put(`/classes/${classId}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          discipline: 'surf',
          level: 'beginner',
          date: '2037-10-15',
          start: '08:00',
          end: '09:00',
          locationId,
          instructorIds,
          capacity: 8,
          notes: null,
          ...change,
        });

    it('re-arms the reminder when an admin moves the start to 10:00', async () => {
      const s1 = await account();
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await enrol(classId, s1.id, 'approved');
      await runJob();

      const moved = await edit(classId, [i1.id], { start: '10:00', end: '11:00' });
      expect(moved.status).toBe(200);
      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toBeNull();

      now = at('09:29');
      await runJob();
      expect(await reminders(s1.id)).toEqual([[paramsOf(classId)]]);

      now = at('09:30');
      await runJob();
      const second = paramsOf(classId, at('10:00'));
      expect(await reminders(s1.id, i1.id)).toEqual([
        [paramsOf(classId), second],
        [paramsOf(classId), second],
      ]);
    });

    it('keeps the class marked when an edit keeps the start', async () => {
      const i1 = await account('instructor');
      const i2 = await account('instructor');
      const classId = await makeClass([i1.id]);
      await runJob();

      const edited = await edit(classId, [i1.id, i2.id], { notes: 'Bring a hat', capacity: 9 });
      now = at('07:40');
      await runJob();

      expect(edited.status).toBe(200);
      expect((await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId } })).reminderSentAt).toEqual(
        at('07:30'),
      );
      expect(await reminders(i1.id, i2.id)).toEqual([[paramsOf(classId)], []]);
    });

    it('reminds a class moved earlier into the window at the next run', async () => {
      const i1 = await account('instructor');
      const classId = await makeClass([i1.id], { startsAt: at('10:00') });
      now = at('07:35');
      await runJob();
      expect(await reminders(i1.id)).toEqual([[]]);

      const moved = await edit(classId, [i1.id], { start: '07:50', end: '08:50' });
      now = new Date(at('07:35').getTime() + MINUTE);
      await runJob();

      expect(moved.status).toBe(200);
      expect(await reminders(i1.id)).toEqual([[paramsOf(classId, at('07:50'))]]);
    });
  });
});
