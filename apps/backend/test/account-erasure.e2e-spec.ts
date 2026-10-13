import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailProvider, GoogleIdTokenPayload, SendSignInCodeIn } from '@rochas-surf-school/auth';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { AccountErasureJob } from '../src/modules/auth/account-erasure.job.js';
import { GoogleAuthIdTokenProvider } from '../src/modules/auth/google.id-token.js';
import { ResendEmailProvider } from '../src/modules/auth/resend.email.js';

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

  beforeEach(async () => {
    email = new CapturingEmailProvider();
    google = new FakeGoogleIdTokenProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(ResendEmailProvider)
      .useValue(email)
      .overrideProvider(GoogleAuthIdTokenProvider)
      .useValue(google)
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    job = app.get(AccountErasureJob);
    await cleanUp();
  });

  afterEach(async () => {
    await cleanUp();
    await app.close();
  });

  async function cleanUp(): Promise<void> {
    // Rows that hang off a user go with it (onDelete: Cascade); the admins' notifications belong to the admins.
    // Sign-ups notify every approved admin of the database, so the notifications about the test accounts go too.
    const accounts = await prisma.user.findMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
      select: { id: true },
    });
    if (accounts.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          type: 'registration.pending',
          OR: accounts.map(({ id }) => ({ params: { path: ['userId'], equals: id } })),
        },
      });
    }
    await prisma.signInCode.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  }

  const http = () => request(app.getHttpServer());

  function createUser(data: {
    status: Status;
    deniedAt?: Date | null;
    removedAt?: Date | null;
    deletedAt?: Date | null;
    role?: 'student' | 'instructor' | 'admin';
    email?: string;
  }) {
    return prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Bruno Lima',
        email: data.email ?? uniqueEmail('bruno'),
        role: data.role ?? 'student',
        status: data.status,
        deniedAt: data.deniedAt,
        removedAt: data.removedAt,
        deletedAt: data.deletedAt,
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

    expect(result.erased).toBeGreaterThanOrEqual(1);
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

    await expect(job.run()).resolves.toEqual({ erased: 0 });

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
});
