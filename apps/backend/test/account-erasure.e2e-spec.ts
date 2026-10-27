import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailProvider, GoogleIdTokenPayload, SendSignInCodeIn } from '@rochas-surf-school/auth';
import type { PushMessage, PushReceipt, PushSendTicket } from '@rochas-surf-school/notifications';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { AccountErasureJob } from '../src/modules/auth/account-erasure.job.js';
import { GoogleAuthIdTokenProvider } from '../src/modules/auth/google.id-token.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { ResendEmailProvider } from '../src/modules/auth/resend.email.js';
import { ExpoPushProvider } from '../src/modules/notifications/expo.push.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'erasure-e2e.example.com';
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    this.sent.push(input);
  }
}

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

class FakeGoogleIdTokenProvider {
  readonly payloads = new Map<string, GoogleIdTokenPayload>();

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    const payload = this.payloads.get(idToken);
    if (!payload) throw new Error('invalid token');
    return payload;
  }
}

type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

function uniqueEmail(name: string): string {
  return `${name}.${randomUUID().slice(0, 8)}@${DOMAIN}`;
}

describe('Account erasure (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let job: AccountErasureJob;
  let email: CapturingEmailProvider;
  let google: FakeGoogleIdTokenProvider;
  let tokens: JwtTokenProvider;
  /** The accounts a test made: an erased one has no email left to find it by. */
  let created: string[];

  beforeEach(async () => {
    email = new CapturingEmailProvider();
    google = new FakeGoogleIdTokenProvider();
    created = [];
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ResendEmailProvider)
      .useValue(email)
      .overrideProvider(GoogleAuthIdTokenProvider)
      .useValue(google)
      .overrideProvider(ExpoPushProvider)
      .useValue(new FakePushProvider())
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    job = app.get(AccountErasureJob);
    tokens = app.get(JwtTokenProvider, { strict: false });
    await cleanUp();
  });

  afterEach(async () => {
    await cleanUp();
    await app.close();
  });

  async function cleanUp(): Promise<void> {
    // Rows that hang off a user go with it (onDelete: Cascade); the admins' notifications belong to the admins.
    // Sign-ups notify every approved admin of the database, so the notifications about the test accounts go too.
    // Classes go first: their enrolments, guests and instructors cascade, and they restrict their students and creator.
    const ours = { OR: [{ email: { endsWith: `@${DOMAIN}` } }, { id: { in: created } }] };
    const accounts = await prisma.user.findMany({ where: ours, select: { id: true } });
    if (accounts.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          type: 'registration.pending',
          OR: accounts.map(({ id }) => ({ params: { path: ['userId'], equals: id } })),
        },
      });
    }
    await prisma.schoolClass.deleteMany({ where: { creator: ours } });
    await prisma.location.deleteMany({ where: { name: { startsWith: DOMAIN } } });
    await prisma.signInCode.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await prisma.user.deleteMany({ where: ours });
  }

  const http = () => request(app.getHttpServer());

  function createUser(data: {
    status: Status;
    deniedAt?: Date | null;
    removedAt?: Date | null;
    deletedAt?: Date | null;
    role?: 'student' | 'instructor' | 'admin';
    email?: string;
    name?: string;
    reactivationRequestedAt?: Date;
  }) {
    const id = randomUUID();
    created.push(id);
    return prisma.user.create({
      data: {
        id,
        name: data.name ?? 'Bruno Lima',
        email: data.email ?? uniqueEmail('bruno'),
        role: data.role ?? 'student',
        status: data.status,
        deniedAt: data.deniedAt,
        removedAt: data.removedAt,
        deletedAt: data.deletedAt,
        reactivationStatus: data.reactivationRequestedAt ? 'requested' : null,
        reactivationRequestedAt: data.reactivationRequestedAt ?? null,
      },
    });
  }

  const deniedAgo = (ms: number) => new Date(Date.now() - ms);
  const exists = async (id: string) => (await prisma.user.count({ where: { id } })) === 1;

  async function seedWithRows(userId: string, email: string) {
    await prisma.identity.createMany({
      data: [
        { id: randomUUID(), userId, provider: 'email', providerUserId: email },
        { id: randomUUID(), userId, provider: 'google', providerUserId: `sub-${randomUUID()}` },
      ],
    });
    await prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash: randomUUID(),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + DAY),
      },
    });
    await prisma.userRulesAcceptance.create({
      data: { userId, version: 1, acceptedAt: new Date() },
    });
    await prisma.notification.create({
      data: { id: randomUUID(), userId, type: 'registration.denied', params: {} },
    });
    await prisma.pushToken.create({
      data: { token: `ExpoPushToken[${randomUUID()}]`, userId, locale: 'pt-BR' },
    });
  }

  const rowsOf = async (userId: string) => ({
    identities: await prisma.identity.count({ where: { userId } }),
    refreshTokens: await prisma.refreshToken.count({ where: { userId } }),
    acceptances: await prisma.userRulesAcceptance.count({ where: { userId } }),
    notifications: await prisma.notification.count({ where: { userId } }),
    pushTokens: await prisma.pushToken.count({ where: { userId } }),
  });

  it('erases an account denied 30 days ago with everything that hangs off it', async () => {
    const userEmail = uniqueEmail('bruno');
    const due = await createUser({ status: 'denied', deniedAt: deniedAgo(30 * DAY), email: userEmail });
    await seedWithRows(due.id, userEmail);
    const author = await createUser({ status: 'approved', role: 'admin' });
    const rule = await prisma.schoolRule.create({
      data: { id: randomUUID(), title: 'Respect', description: 'Be kind', index: 9999, createdBy: author.id },
    });
    await expect(rowsOf(due.id)).resolves.toEqual({
      identities: 2,
      refreshTokens: 1,
      acceptances: 1,
      notifications: 1,
      pushTokens: 1,
    });

    const result = await job.run();

    expect(result.deniedRegistrations).toBeGreaterThanOrEqual(1);
    await expect(exists(due.id)).resolves.toBe(false);
    await expect(rowsOf(due.id)).resolves.toEqual({
      identities: 0,
      refreshTokens: 0,
      acceptances: 0,
      notifications: 0,
      pushTokens: 0,
    });
    await expect(exists(author.id)).resolves.toBe(true);
    await prisma.schoolRule.delete({ where: { id: rule.id } });
  });

  it('erases only the accounts due and keeps the rest', async () => {
    const old = deniedAgo(60 * DAY);
    const recent = await createUser({ status: 'denied', deniedAt: deniedAgo(30 * DAY - MINUTE) });
    const undated = await createUser({ status: 'denied', deniedAt: null });
    const others = await Promise.all(
      (['pending', 'approved', 'deleted', 'removed'] as Status[]).map((status) =>
        createUser({ status, deniedAt: old, removedAt: old, deletedAt: old }),
      ),
    );

    await job.run();

    for (const user of [recent, undated, ...others]) {
      await expect(exists(user.id)).resolves.toBe(true);
    }
  });

  it('is idempotent: a second run erases nothing and changes no row', async () => {
    const due = await createUser({ status: 'denied', deniedAt: deniedAgo(31 * DAY) });
    const kept = await createUser({ status: 'denied', deniedAt: deniedAgo(DAY) });
    await job.run();
    const before = await prisma.user.count();

    await expect(job.run()).resolves.toMatchObject({ deniedRegistrations: 0 });

    await expect(prisma.user.count()).resolves.toBe(before);
    await expect(exists(due.id)).resolves.toBe(false);
    await expect(exists(kept.id)).resolves.toBe(true);
  });

  describe('notifications', () => {
    const pendingAbout = (adminId: string, userId: string) =>
      prisma.notification.count({
        where: { userId: adminId, type: 'registration.pending', params: { path: ['userId'], equals: userId } },
      });

    async function signUp(name: string) {
      const userEmail = uniqueEmail(name.split(' ')[0]!.toLowerCase());
      await http().post('/auth/email/code').send({ email: userEmail }).expect(202);
      const response = await http()
        .post('/auth/email/verify')
        .send({ email: userEmail, code: email.sent.at(-1)!.code, name })
        .expect(200);
      return { email: userEmail, id: response.body.user.id as string };
    }

    it('carry the new account id and are deleted with the erased account only', async () => {
      const admin = await createUser({ status: 'approved', role: 'admin' });
      const first = await signUp('Ana Souza');
      const second = await signUp('Bia Souza');

      const stored = await prisma.notification.findMany({
        where: { userId: admin.id, type: 'registration.pending' },
        orderBy: { createdAt: 'asc' },
      });
      expect(stored.map((item) => item.params)).toEqual([
        { name: 'Ana Souza', userId: first.id },
        { name: 'Bia Souza', userId: second.id },
      ]);
      await prisma.notification.create({
        data: { id: randomUUID(), userId: admin.id, type: 'registration.approved', params: { userId: first.id } },
      });
      const legacy = await prisma.notification.create({
        data: { id: randomUUID(), userId: admin.id, type: 'registration.pending', params: { name: 'Old' } },
      });
      await prisma.user.update({
        where: { id: first.id },
        data: { status: 'denied', deniedAt: deniedAgo(30 * DAY) },
      });
      await prisma.user.update({
        where: { id: second.id },
        data: { status: 'denied', deniedAt: deniedAgo(DAY) },
      });

      await job.run();

      await expect(pendingAbout(admin.id, first.id)).resolves.toBe(0);
      await expect(pendingAbout(admin.id, second.id)).resolves.toBe(1);
      await expect(
        prisma.notification.count({ where: { id: legacy.id } }),
      ).resolves.toBe(1);
      await expect(
        prisma.notification.count({ where: { userId: admin.id, type: 'registration.approved' } }),
      ).resolves.toBe(1);
      await prisma.notification.deleteMany({ where: { userId: admin.id } });
    });
  });

  describe('signs up again', () => {
    it('by email code, as a new registration, with the old session refused', async () => {
      const admin = await createUser({ status: 'approved', role: 'admin' });
      const userEmail = uniqueEmail('carla');
      await http().post('/auth/email/code').send({ email: userEmail }).expect(202);
      const first = await http()
        .post('/auth/email/verify')
        .send({ email: userEmail, code: email.sent.at(-1)!.code, name: 'Carla Dias' })
        .expect(200);
      await prisma.user.update({
        where: { id: first.body.user.id },
        data: { status: 'denied', denialReason: 'Unknown', deniedAt: deniedAgo(30 * DAY) },
      });

      await job.run();

      await expect(exists(first.body.user.id)).resolves.toBe(false);
      const refresh = await http().post('/auth/refresh').send({ refreshToken: first.body.refreshToken });
      expect(refresh.status).toBe(401);
      expect(refresh.body.errors).toEqual(['auth.refreshToken.invalid']);
      const me = await http().get('/auth/me').set('Authorization', `Bearer ${first.body.accessToken}`);
      expect(me.status).toBe(401);
      expect(me.body.errors).toEqual(['auth.token.invalid']);

      await http().post('/auth/email/code').send({ email: userEmail }).expect(202);
      const again = await http()
        .post('/auth/email/verify')
        .send({ email: userEmail, code: email.sent.at(-1)!.code, name: 'Carla Dias' });

      expect(again.status).toBe(200);
      expect(again.body.user.id).not.toBe(first.body.user.id);
      expect(again.body.user).toMatchObject({
        email: userEmail,
        status: 'pending',
        denialReason: null,
        reactivationStatus: null,
      });
      await expect(
        prisma.notification.count({
          where: {
            userId: admin.id,
            type: 'registration.pending',
            params: { path: ['userId'], equals: again.body.user.id },
          },
        }),
      ).resolves.toBe(1);
      await prisma.notification.deleteMany({ where: { userId: admin.id } });
    });

    it('by Google, as a new registration', async () => {
      const admin = await createUser({ status: 'approved', role: 'admin' });
      const userEmail = uniqueEmail('dani');
      const sub = `sub-${randomUUID()}`;
      const signIn = async () => {
        const idToken = `token-${randomUUID()}`;
        google.payloads.set(idToken, { sub, email: userEmail, emailVerified: true, name: 'Dani Reis' });
        return http().post('/auth/google').send({ idToken });
      };
      const first = await signIn();
      expect(first.status).toBe(200);
      await prisma.user.update({
        where: { id: first.body.user.id },
        data: { status: 'denied', deniedAt: deniedAgo(45 * DAY) },
      });

      await job.run();
      const again = await signIn();

      expect(again.status).toBe(200);
      expect(again.body.user.id).not.toBe(first.body.user.id);
      expect(again.body.user).toMatchObject({
        email: userEmail,
        status: 'pending',
        denialReason: null,
        reactivationStatus: null,
      });
      await expect(
        prisma.notification.count({
          where: {
            userId: admin.id,
            type: 'registration.pending',
            params: { path: ['userId'], equals: again.body.user.id },
          },
        }),
      ).resolves.toBe(1);
      await prisma.notification.deleteMany({ where: { userId: admin.id } });
    });
  });

  describe('closed accounts', () => {
    const ago = (ms: number) => new Date(Date.now() - ms);
    const DUE = 30 * DAY + MINUTE;
    const asAdmin = async () => {
      const admin = await createUser({ status: 'approved', role: 'admin', name: 'Admin Erasure' });
      return { ...admin, accessToken: tokens.signAccessToken({ id: admin.id, email: admin.email! }).token };
    };
    const authed = (accessToken: string, req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);
    const rowOf = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });

    /** Signs a new account up through the real email flow; its sign-in rows (identity, refresh token) are real. */
    async function signUp(name: string) {
      const userEmail = uniqueEmail(name.split(' ')[0]!.toLowerCase());
      await http().post('/auth/email/code').send({ email: userEmail }).expect(202);
      const response = await http()
        .post('/auth/email/verify')
        .send({ email: userEmail, code: email.sent.at(-1)!.code, name })
        .expect(200);
      created.push(response.body.user.id);
      return {
        id: response.body.user.id as string,
        email: userEmail,
        accessToken: response.body.accessToken as string,
        refreshToken: response.body.refreshToken as string,
      };
    }

    async function makeLocation() {
      return prisma.location.create({
        data: { id: randomUUID(), name: `${DOMAIN} ${randomUUID()}`, nameKey: `${DOMAIN} ${randomUUID()}`, address: 'Av. Beira Mar' },
      });
    }

    /** A class that ended yesterday, with its instructors, approved students and guests. */
    async function pastClass(creatorId: string, people: { instructors?: string[]; students?: string[]; guests?: string[] }) {
      const location = await makeLocation();
      const startsAt = ago(DAY);
      const id = randomUUID();
      await prisma.schoolClass.create({
        data: {
          id,
          discipline: 'surf',
          level: 'beginner',
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * MINUTE),
          locationId: location.id,
          capacity: 8,
          createdBy: creatorId,
          instructors: { create: (people.instructors ?? []).map((userId) => ({ userId })) },
        },
      });
      for (const [index, studentId] of (people.students ?? []).entries()) {
        await prisma.enrolment.create({
          data: {
            id: randomUUID(),
            classId: id,
            studentId,
            status: 'approved',
            requestedAt: ago(3 * DAY),
            decidedAt: new Date(ago(2 * DAY).getTime() + index * MINUTE),
          },
        });
      }
      for (const name of people.guests ?? []) {
        await prisma.guest.create({ data: { id: randomUUID(), classId: id, name, whatsappNumber: '+5585999990000' } });
      }
      return { id, date: startsAt.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) };
    }

    function expectErased(row: Awaited<ReturnType<typeof rowOf>>, kept: { role: string; createdAt: Date }) {
      expect(row).toMatchObject({
        status: 'erased',
        name: null,
        email: null,
        photoUrl: null,
        whatsappNumber: null,
        whatsappVisible: false,
        denialReason: null,
        deniedAt: null,
        reactivationStatus: null,
        reactivationRequestedAt: null,
        role: kept.role,
        createdAt: kept.createdAt,
      });
      expect(row.erasedAt).toBeInstanceOf(Date);
    }

    describe('erases a deleted account', () => {
      it('30 days and 1 minute after the deletion, keeping its history and freeing its email', async () => {
        const admin = await asAdmin();
        const person = await signUp('Elisa Prado');
        const deletedAt = ago(DUE);
        await prisma.user.update({
          where: { id: person.id },
          data: {
            status: 'deleted',
            role: 'instructor',
            deletedAt,
            photoUrl: 'https://cdn.example.com/elisa.jpg',
            whatsappNumber: '+5585988887777',
            whatsappVisible: true,
          },
        });
        await prisma.pushToken.create({
          data: { token: `ExpoPushToken[${randomUUID()}]`, userId: person.id, locale: 'pt-BR' },
        });
        await prisma.userRulesAcceptance.create({ data: { userId: person.id, version: 1, acceptedAt: new Date() } });
        await prisma.notification.create({
          data: { id: randomUUID(), userId: person.id, type: 'registration.approved', params: {} },
        });
        // A sign-in code asked for the old email before the erasure.
        await http().post('/auth/email/code').send({ email: person.email }).expect(202);
        const taught = await pastClass(admin.id, { instructors: [person.id] });
        const attended = await pastClass(admin.id, { students: [person.id] });
        const before = await rowOf(person.id);
        expect(await rowsOf(person.id)).toEqual({
          identities: 1,
          refreshTokens: 1,
          acceptances: 1,
          notifications: 1,
          pushTokens: 1,
        });

        const result = await job.run();

        expect(result.closedAccounts).toBeGreaterThanOrEqual(1);
        const row = await rowOf(person.id);
        expectErased(row, { role: 'instructor', createdAt: before.createdAt });
        expect(row.deletedAt).toEqual(deletedAt);
        await expect(rowsOf(person.id)).resolves.toEqual({
          identities: 0,
          refreshTokens: 0,
          acceptances: 0,
          notifications: 0,
          pushTokens: 0,
        });
        await expect(prisma.signInCode.count({ where: { email: person.email } })).resolves.toBe(0);
        await expect(prisma.enrolment.count({ where: { classId: attended.id, studentId: person.id, status: 'approved' } })).resolves.toBe(1);
        await expect(prisma.classInstructor.count({ where: { classId: taught.id, userId: person.id } })).resolves.toBe(1);

        const me = await authed(person.accessToken, http().get('/auth/me'));
        expect([me.status, me.body.errors]).toEqual([401, ['auth.token.invalid']]);
        const refresh = await http().post('/auth/refresh').send({ refreshToken: person.refreshToken });
        expect([refresh.status, refresh.body.errors]).toEqual([401, ['auth.refreshToken.invalid']]);

        await http().post('/auth/email/code').send({ email: person.email }).expect(202);
        const again = await http()
          .post('/auth/email/verify')
          .send({ email: person.email, code: email.sent.at(-1)!.code, name: 'Elisa Prado' });
        expect(again.status).toBe(200);
        expect(again.body.user.id).not.toBe(person.id);
        expect(again.body.user).toMatchObject({ email: person.email, status: 'pending', role: 'student' });
        await prisma.notification.deleteMany({ where: { userId: admin.id } });
      });
    });

    describe('erases a removed account', () => {
      it('30 days and 1 minute after the removal; it can no longer be listed or restored', async () => {
        const admin = await asAdmin();
        const removed = await createUser({ status: 'removed', removedAt: ago(DUE), name: 'Fabio Removido' });

        await job.run();

        const row = await rowOf(removed.id);
        expectErased(row, { role: 'student', createdAt: removed.createdAt });
        expect(row.removedAt).toEqual(removed.removedAt);
        const list = await authed(admin.accessToken, http().get('/people/removed')).expect(200);
        expect((list.body.items as { id: string }[]).map((item) => item.id)).not.toContain(removed.id);
        const restore = await authed(admin.accessToken, http().post(`/people/${removed.id}/restore`));
        expect([restore.status, restore.body.errors]).toEqual([404, ['user.notFound']]);
      });
    });

    describe('leaves', () => {
      it('the accounts not due, without a date, or in another status as they are', async () => {
        const old = ago(60 * DAY);
        const kept = await Promise.all([
          createUser({ status: 'deleted', deletedAt: ago(30 * DAY - 60 * MINUTE) }),
          createUser({ status: 'removed', removedAt: ago(29 * DAY) }),
          createUser({ status: 'deleted', deletedAt: null }),
          createUser({ status: 'removed', removedAt: null }),
          createUser({ status: 'approved', deletedAt: old, removedAt: old }),
          createUser({ status: 'pending', deletedAt: old, removedAt: old }),
          createUser({ status: 'denied', deniedAt: ago(DAY), deletedAt: old, removedAt: old }),
        ]);
        const before = await Promise.all(kept.map((user) => rowOf(user.id)));

        await job.run();

        await expect(Promise.all(kept.map((user) => rowOf(user.id)))).resolves.toEqual(before);
      });

      it('nothing to erase on a second run, and a due denied registration to spec 021 (deleted, not anonymised)', async () => {
        const due = await createUser({ status: 'deleted', deletedAt: ago(DUE) });
        const denied = await createUser({ status: 'denied', deniedAt: ago(DUE), deletedAt: ago(DUE) });

        await job.run();
        const after = await rowOf(due.id);

        await expect(job.run()).resolves.toMatchObject({ closedAccounts: 0 });
        await expect(rowOf(due.id)).resolves.toEqual(after);
        expect(after.status).toBe('erased');
        await expect(exists(denied.id)).resolves.toBe(false);
      });
    });

    describe('with a pending reactivation request', () => {
      it('erases it all the same: the request leaves the list and can no longer be approved', async () => {
        const admin = await asAdmin();
        const asking = await createUser({
          status: 'deleted',
          deletedAt: ago(DUE),
          reactivationRequestedAt: ago(DAY),
          name: 'Gil Pedido',
        });
        const notice = await prisma.notification.create({
          data: {
            id: randomUUID(),
            userId: admin.id,
            type: 'reactivation.requested',
            params: { name: 'Gil Pedido', userId: asking.id },
          },
        });
        const listed = await authed(admin.accessToken, http().get('/reactivation-requests')).expect(200);
        expect((listed.body.items as { id: string }[]).map((item) => item.id)).toContain(asking.id);

        await job.run();

        expectErased(await rowOf(asking.id), { role: 'student', createdAt: asking.createdAt });
        const list = await authed(admin.accessToken, http().get('/reactivation-requests')).expect(200);
        expect((list.body.items as { id: string }[]).map((item) => item.id)).not.toContain(asking.id);
        const approve = await authed(admin.accessToken, http().post(`/reactivation-requests/${asking.id}/approve`));
        expect([approve.status, approve.body.errors]).toEqual([404, ['reactivation.notFound']]);
        await expect(prisma.notification.count({ where: { id: notice.id } })).resolves.toBe(0);
      });
    });

    describe('in a class', () => {
      it('answers an erased instructor and student with their ids and a null name, the others unchanged', async () => {
        const admin = await asAdmin();
        const instructor = await createUser({ status: 'deleted', deletedAt: ago(DUE), role: 'instructor', name: 'Igor Apagado' });
        const teacher = await createUser({ status: 'approved', role: 'instructor', name: 'Ana Instrutora' });
        const student = await createUser({ status: 'removed', removedAt: ago(DUE), name: 'Sara Apagada' });
        const classmate = await createUser({ status: 'approved', name: 'Beto Aluno' });
        const lesson = await pastClass(admin.id, {
          instructors: [instructor.id, teacher.id],
          students: [student.id, classmate.id],
          guests: ['Carolina Reis'],
        });

        await job.run();

        const details = await authed(admin.accessToken, http().get(`/classes/${lesson.id}`)).expect(200);
        expect(details.body.instructors).toEqual([
          expect.objectContaining({ id: teacher.id, name: 'Ana Instrutora' }),
          expect.objectContaining({ id: instructor.id, name: null }),
        ]);
        expect(details.body.students).toEqual([
          expect.objectContaining({ id: student.id, name: null, photoUrl: null }),
          expect.objectContaining({ id: classmate.id, name: 'Beto Aluno' }),
        ]);
        expect(details.body.seatsTaken).toBe(3);
        expect(details.body.guests).toEqual([expect.objectContaining({ name: 'Carolina Reis' })]);

        const week = await authed(admin.accessToken, http().get(`/classes?date=${lesson.date}`)).expect(200);
        const item = (week.body.items as { id: string }[]).find((entry) => entry.id === lesson.id);
        expect(item).toMatchObject({
          instructors: [
            { id: teacher.id, name: 'Ana Instrutora' },
            { id: instructor.id, name: null },
          ],
          students: [
            { id: student.id, name: null },
            { id: classmate.id, name: 'Beto Aluno' },
          ],
          seatsTaken: 3,
          guests: [expect.objectContaining({ name: 'Carolina Reis' })],
        });
      });
    });

    describe('notifications', () => {
      it('about the erased person are deleted from everyone’s inbox; the others stay', async () => {
        const admin = await asAdmin();
        const teacher = await createUser({ status: 'approved', role: 'instructor' });
        const erased = await createUser({ status: 'deleted', deletedAt: ago(DUE) });
        const other = await createUser({ status: 'approved' });
        const about = (personId: string) => [
          { userId: admin.id, type: 'registration.pending' as const, params: { name: 'X', userId: personId } },
          { userId: admin.id, type: 'reactivation.requested' as const, params: { name: 'X', userId: personId } },
          { userId: admin.id, type: 'enrolment.requested' as const, params: { studentName: 'X', studentId: personId } },
          { userId: admin.id, type: 'enrolment.cancelled' as const, params: { studentName: 'X', studentId: personId } },
          { userId: teacher.id, type: 'enrolment.requested' as const, params: { studentName: 'X', studentId: personId } },
          { userId: teacher.id, type: 'enrolment.cancelled' as const, params: { studentName: 'X', studentId: personId } },
        ];
        const legacy = { userId: teacher.id, type: 'enrolment.requested' as const, params: { studentName: 'X' } };
        const rows = [...about(erased.id), ...about(other.id), legacy].map((data) => ({ id: randomUUID(), ...data }));
        await prisma.notification.createMany({ data: rows });

        await job.run();

        const left = await prisma.notification.findMany({
          where: { id: { in: rows.map((row) => row.id) } },
          select: { id: true },
        });
        expect(left.map((row) => row.id).sort()).toEqual(rows.slice(6).map((row) => row.id).sort());
      });
    });
  });
});
