import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailProvider, SendSignInCodeIn } from '@rochas-surf-school/auth';
import type { PushMessage, PushReceipt, PushSendTicket } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { ResendEmailProvider } from '../src/modules/auth/resend.email.js';
import { SystemClockProvider as ClassesClockProvider } from '../src/modules/classes/system.clock.js';
import { SystemClockProvider as EnrolmentClockProvider } from '../src/modules/enrolment/system.clock.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';
import { renderPush } from '../src/modules/notifications/push-messages.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'profile.e2e.example.com';

/** Captures the emails instead of sending them through Resend. */
class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    this.sent.push(input);
  }
}

type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

interface Context {
  app: INestApplication<App>;
  prisma: PrismaService;
  email: CapturingEmailProvider;
}

async function createApp(): Promise<Context> {
  const email = new CapturingEmailProvider();
  const moduleRef = await Test.createTestingModule({
    imports: [(await import('../src/app.module.js')).AppModule],
  })
    .overrideProvider(ResendEmailProvider)
    .useValue(email)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return { app, prisma: app.get(PrismaService), email };
}

function uniqueEmail(name: string): string {
  return `${name}.${randomUUID().slice(0, 8)}@${DOMAIN}`;
}

describe('PUT /auth/me/name (e2e)', () => {
  let ctx: Context;

  beforeEach(async () => {
    ctx = await createApp();
  });

  afterEach(async () => {
    await ctx.prisma.schoolRule.deleteMany();
    await ctx.prisma.rulesVersion.updateMany({ data: { version: 0 } });
    await ctx.prisma.signInCode.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await ctx.prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());

  async function createUser(status: Status = 'approved') {
    const user = await ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: uniqueEmail('ana'),
        status,
        role: 'student',
      },
    });
    await http().post('/auth/email/code').send({ email: user.email }).expect(202);
    const code = ctx.email.sent.at(-1)!.code;
    const verified = await http().post('/auth/email/verify').send({ email: user.email, code }).expect(200);
    return { user, accessToken: verified.body.accessToken as string };
  }

  const save = (accessToken: string | undefined, body?: object) => {
    const req = http().put('/auth/me/name');
    const authorized = accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
    return body === undefined ? authorized : authorized.send(body);
  };
  const me = (accessToken: string) => http().get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

  it('saves the trimmed name of an approved account and changes nothing else', async () => {
    const { user, accessToken } = await createUser();

    const response = await save(accessToken, { name: '  Ana Clara Souza ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      name: 'Ana Clara Souza',
      email: user.email,
      role: 'student',
      status: 'approved',
      createdAt: user.createdAt.toISOString(),
      whatsappNumber: null,
      whatsappVisible: false,
      rulesAccepted: true,
      rulesAcceptedBefore: false,
      denialReason: null,
      reactivationStatus: null,
    });
    expect((await me(accessToken)).body).toMatchObject({ name: 'Ana Clara Souza', email: user.email });
  });

  it.each(['pending', 'denied', 'deleted', 'removed'] as const)('refuses a %s account', async (status) => {
    const { user, accessToken } = await createUser(status);

    const response = await save(accessToken, { name: 'Ana Clara Souza' });

    expect(response.status).toBe(403);
    expect(response.body.errors).toEqual(['user.status.notApproved']);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe('Ana Rocha');
  });

  it('refuses without a token', async () => {
    const response = await save(undefined, { name: 'Ana Clara Souza' });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.token.invalid']);
  });

  it('refuses an invalid token', async () => {
    const response = await save('not-a-jwt', { name: 'Ana Clara Souza' });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.token.invalid']);
  });

  describe('invalid input', () => {
    it.each([
      ['a missing name', {}],
      ['a non-string name', { name: 42 }],
      ['an empty name', { name: '' }],
      ['a blank name', { name: '   ' }],
    ])('answers 422 user.name.required for %s', async (_label, body) => {
      const { accessToken } = await createUser();

      const response = await save(accessToken, body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['user.name.required']);
      expect((await me(accessToken)).body.name).toBe('Ana Rocha');
    });

    it.each([
      ['a one-letter name', 'A'],
      ['a name with digits', 'Ana 2'],
      ['a name over 80 characters', 'x'.repeat(81)],
    ])('answers 422 with a user.name.* key for %s and keeps the name', async (_label, name) => {
      const { accessToken } = await createUser();

      const response = await save(accessToken, { name });

      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBeGreaterThan(0);
      response.body.errors.forEach((key: string) => expect(key).toMatch(/^user\.name\./));
      expect((await me(accessToken)).body.name).toBe('Ana Rocha');
    });

    it('answers 422 without a body', async () => {
      const { accessToken } = await createUser();

      const response = await save(accessToken);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['user.name.required']);
    });
  });
});

describe('DELETE /auth/me (e2e)', () => {
  let ctx: Context;

  beforeEach(async () => {
    ctx = await createApp();
  });

  afterEach(async () => {
    await ctx.prisma.signInCode.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await ctx.prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());

  async function createUser(status: Status) {
    const user = await ctx.prisma.user.create({
      data: { id: randomUUID(), name: 'Ana Rocha', email: uniqueEmail('del'), status, role: 'student' },
    });
    await http().post('/auth/email/code').send({ email: user.email }).expect(202);
    const code = ctx.email.sent.at(-1)!.code;
    const verified = await http().post('/auth/email/verify').send({ email: user.email, code }).expect(200);
    return { user, accessToken: verified.body.accessToken as string };
  }

  it('closes the account of an approved user', async () => {
    const { user, accessToken } = await createUser('approved');

    const response = await http().delete('/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
    const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.status).toBe('deleted');
    expect(stored.deletedAt).not.toBeNull();
  });

  it('refuses a pending account', async () => {
    const { user, accessToken } = await createUser('pending');

    const response = await http().delete('/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.errors).toEqual(['user.status.notApproved']);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('pending');
  });

  it('refuses without a token', async () => {
    const response = await http().delete('/auth/me');

    expect(response.status).toBe(401);
  });
});

/** Records the pushes instead of calling Expo. */
class FakePushProvider {
  readonly sent: PushMessage[] = [];

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    this.sent.push(...messages);
    return messages.map(() => ({ status: 'ok', id: `ticket-${randomUUID()}` }));
  }

  async getReceipts(): Promise<Record<string, PushReceipt>> {
    return {};
  }
}

// The name the -t filters of spec 035 use: "DELETE /auth/me releases" and "DELETE /auth/me notifies".
describe('DELETE /auth/me', () => {
  // Wednesday 2026-10-14, 10:00 in Fortaleza: the classes module's clock.
  const NOW = new Date('2026-10-14T13:00:00.000Z');
  const HOUR = 60 * 60 * 1000;
  const MARK = 'e2erelease';

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let push: FakePushProvider;
  let locationId: string;
  let creatorId: string;
  let creatorToken: string;
  let classIds: string[];

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
    ({ id: creatorId, accessToken: creatorToken } = await account('admin', 'approved', 'Carla Lima'));
  });

  afterEach(async () => {
    // Classes go first (their location and creator are restricted); instructors cascade with the users.
    // The approved admins already in the database were told too: their notifications go with the test's classes.
    await prisma.notification.deleteMany({
      where: {
        type: { in: ['class.noInstructor', 'enrolment.cancelled'] },
        OR: classIds.map((id) => ({ params: { path: ['classId'], equals: id } })),
      },
    });
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function account(
    role: 'student' | 'instructor' | 'admin' = 'instructor',
    status: Status = 'approved',
    name = 'Ana Rocha',
  ) {
    const user = await prisma.user.create({
      data: { id: randomUUID(), name, email: uniqueEmail(MARK), role, status },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  /** A class starting `fromNowHours` after the clock, one hour long. */
  async function classWith(
    instructorIds: string[],
    fromNowHours: number,
    extra: { discipline?: 'surf' | 'skate'; cancelledAt?: Date } = {},
  ) {
    const startsAt = new Date(NOW.getTime() + fromNowHours * HOUR);
    const created = await prisma.schoolClass.create({
      data: {
        id: randomUUID(),
        discipline: extra.discipline ?? 'surf',
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        locationId,
        capacity: 8,
        createdBy: creatorId,
        cancelledAt: extra.cancelledAt ?? null,
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

  const deleteMe = (accessToken: string) =>
    http().delete('/auth/me').set('Authorization', `Bearer ${accessToken}`);

  async function instructorsOf(classId: string, accessToken: string): Promise<string[]> {
    const response = await http().get(`/classes/${classId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    return (response.body.instructors as { id: string }[]).map((item) => item.id);
  }

  it('releases an instructor from the upcoming classes only, keeping the started, finished and cancelled ones', async () => {
    const viewer = await account('admin');
    const leaving = await account('instructor');
    const coInstructor = await account('instructor');
    const tomorrow = await classWith([leaving.id, coInstructor.id], 22);
    const underWay = await classWith([leaving.id], -0.5);
    const finished = await classWith([leaving.id], -24);
    const cancelled = await classWith([leaving.id], 30, { cancelledAt: new Date(NOW.getTime() - HOUR) });

    const response = await deleteMe(leaving.accessToken);

    expect(response.status).toBe(204);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: leaving.id } })).status).toBe('deleted');
    expect(await instructorsOf(tomorrow, viewer.accessToken)).toEqual([coInstructor.id]);
    expect(await instructorsOf(underWay, viewer.accessToken)).toEqual([leaving.id]);
    expect(await instructorsOf(finished, viewer.accessToken)).toEqual([leaving.id]);
    expect(await instructorsOf(cancelled, viewer.accessToken)).toEqual([leaving.id]);
    expect(push.sent).toEqual([]);
  });

  it('releases an admin who teaches the same way, leaving the class scheduled with no instructor', async () => {
    const viewer = await account('admin');
    const leaving = await account('admin');
    const alone = await classWith([leaving.id], 22);

    expect((await deleteMe(leaving.accessToken)).status).toBe(204);

    expect(await instructorsOf(alone, viewer.accessToken)).toEqual([]);
    expect(await prisma.schoolClass.count({ where: { id: alone } })).toBe(1);
  });

  it("releases nothing for a student's deletion", async () => {
    const instructor = await account('instructor');
    const student = await account('student');
    await classWith([instructor.id], 22);
    const before = await prisma.classInstructor.count({ where: { schoolClass: { locationId } } });

    expect((await deleteMe(student.accessToken)).status).toBe(204);

    expect(await prisma.classInstructor.count({ where: { schoolClass: { locationId } } })).toBe(before);
    expect(push.sent).toEqual([]);
  });

  it('notifies the approved admins once about the classes left with nobody, not the admin who left', async () => {
    const adminA = await account('admin', 'approved', 'Bruno Alves');
    const adminB = await account('admin', 'approved', 'Davi Melo');
    const notApproved = await Promise.all(
      (['pending', 'denied', 'deleted', 'removed'] as const).map((status) => account('admin', status)),
    );
    const leaving = await account('admin', 'approved', 'Eva Costa');
    const coInstructor = await account('instructor');
    const later = await classWith([leaving.id], 46, { discipline: 'skate' });
    const earliest = await classWith([leaving.id], 22, { discipline: 'surf' });
    await classWith([leaving.id, coInstructor.id], 10);
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId: adminA.id, locale: 'pt-BR' },
    });

    expect((await deleteMe(leaving.accessToken)).status).toBe(204);

    const params = {
      count: 2,
      classId: earliest,
      discipline: 'surf',
      startsAt: new Date(NOW.getTime() + 22 * HOUR).toISOString(),
    };
    const stored = await prisma.notification.findMany({
      where: { type: 'class.noInstructor', userId: { in: [adminA.id, adminB.id, leaving.id, ...notApproved.map((item) => item.id)] } },
      orderBy: { userId: 'asc' },
    });
    expect(stored.map((item) => [item.userId, item.params])).toEqual(
      [adminA.id, adminB.id].sort().map((userId) => [userId, params]),
    );
    expect(later).not.toBe(earliest);
    const toAdminA = push.sent.filter((message) => message.type === 'class.noInstructor' && message.token.includes(MARK));
    expect(toAdminA).toHaveLength(1);
    expect(toAdminA[0]).toMatchObject({ locale: 'pt-BR', params });
    expect(renderPush('class.noInstructor', toAdminA[0]!.params, 'pt-BR')).toEqual({
      title: 'Aulas sem instrutor',
      body: '2 aulas ficaram sem instrutor. A próxima: Surf, 15/10 às 08:00.',
    });
  });

  it('delete releases seats: cancels the upcoming seat, withdraws the request and tells the school', async () => {
    const student = await account('student', 'approved', 'Ana Souza');
    const waiting = await account('student');
    const upcoming = await classWith([], 22);
    const another = await classWith([], 46);
    const started = await classWith([], -0.5);
    const seat = await seedEnrolment(upcoming, student.id, 'approved');
    await seedEnrolment(upcoming, waiting.id, 'pending');
    const request = await seedEnrolment(another, student.id, 'pending');
    const underWay = await seedEnrolment(started, student.id, 'approved');
    await prisma.pushToken.create({
      data: { token: `ExponentPushToken[${MARK}-${randomUUID().slice(0, 8)}]`, userId: creatorId, locale: 'pt-BR' },
    });

    expect((await deleteMe(student.accessToken)).status).toBe(204);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).status).toBe('deleted');
    expect(await prisma.enrolment.findUniqueOrThrow({ where: { id: seat } })).toMatchObject({ status: 'cancelled', endedAt: NOW });
    expect(await prisma.enrolment.findUniqueOrThrow({ where: { id: request } })).toMatchObject({ status: 'withdrawn', endedAt: NOW });
    expect((await prisma.enrolment.findUniqueOrThrow({ where: { id: underWay } })).status).toBe('approved');
    const stored = await prisma.notification.findMany({
      where: { type: 'enrolment.cancelled', userId: creatorId },
    });
    expect(stored.map((item) => item.params)).toEqual([
      {
        classId: upcoming,
        studentName: 'Ana Souza',
        discipline: 'surf',
        startsAt: new Date(NOW.getTime() + 22 * HOUR).toISOString(),
        waitingCount: 1,
      },
    ]);
    const sent = push.sent.filter((message) => message.type === 'enrolment.cancelled' && message.token.includes(MARK));
    expect(sent).toHaveLength(1);
    expect(renderPush('enrolment.cancelled', sent[0]!.params, 'pt-BR').body).toBe(
      'Ana Souza cancelou a vaga na aula de Surf de 15/10 às 08:00. 1 na lista de espera.',
    );
  });
  describe('only admin', () => {
    // The database is shared: the approved admins that aren't the test's are set aside (made instructors), so the
    // classes' creator is the school's only approved admin, and put back after every test.
    let setAside: string[];

    beforeEach(async () => {
      const others = await prisma.user.findMany({
        where: { role: 'admin', status: 'approved', NOT: { email: { endsWith: `@${DOMAIN}` } } },
        select: { id: true },
      });
      setAside = others.map((item) => item.id);
      if (setAside.length > 0) {
        await prisma.$executeRaw`UPDATE users SET role = 'instructor' WHERE id = ANY(${setAside}::uuid[])`;
      }
    });

    afterEach(async () => {
      if (setAside.length > 0) {
        await prisma.$executeRaw`UPDATE users SET role = 'admin' WHERE id = ANY(${setAside}::uuid[])`;
      }
    });

    it('refuses the only approved admin with 409 user.role.lastAdmin, keeping the account and its classes', async () => {
      const upcoming = await classWith([creatorId], 22);

      const response = await deleteMe(creatorToken);

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['user.role.lastAdmin']);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: creatorId } })).status).toBe('approved');
      expect(await instructorsOf(upcoming, creatorToken)).toEqual([creatorId]);
    });

    it('closes an admin account as before when another approved admin remains', async () => {
      const leaving = await account('admin');
      const upcoming = await classWith([leaving.id], 22);

      expect((await deleteMe(leaving.accessToken)).status).toBe(204);

      expect((await prisma.user.findUniqueOrThrow({ where: { id: leaving.id } })).status).toBe('deleted');
      expect(await instructorsOf(upcoming, creatorToken)).toEqual([]);
    });

    it.each(['student', 'instructor'] as const)('never refuses a %s', async (role) => {
      const leaving = await account(role);

      expect((await deleteMe(leaving.accessToken)).status).toBe(204);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: leaving.id } })).status).toBe('deleted');
    });
  });
});
