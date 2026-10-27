import { createHash, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { EmailProvider, SendSignInCodeIn } from '@rochas-surf-school/auth';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { ResendEmailProvider } from '../src/modules/auth/resend.email.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'session.e2e.example.com';

/** Captures the emails instead of sending them through Resend. */
class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    this.sent.push(input);
  }
}

type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
type Role = 'student' | 'instructor' | 'admin';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: Status;
    createdAt: string;
    whatsappNumber: string | null;
    whatsappVisible: boolean;
    rulesAccepted: boolean;
    rulesAcceptedBefore: boolean;
    denialReason: string | null;
    reactivationStatus: 'requested' | 'denied' | null;
  };
}

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

describe('Session endpoints (e2e)', () => {
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
  const me = (accessToken?: string) => {
    const req = http().get('/auth/me');
    return accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
  };
  const refresh = (body: object) => http().post('/auth/refresh').send(body);
  const signOut = (body: object) => http().post('/auth/sign-out').send(body);

  function createUser(data: Partial<{ status: Status; role: Role; email: string }> = {}) {
    return ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: data.email ?? uniqueEmail('ana'),
        status: data.status ?? 'approved',
        role: data.role ?? 'student',
      },
    }).then((user) => ({ ...user, email: user.email! }));
  }

  /** Signs an existing account in through the real email flow. */
  async function signIn(email: string): Promise<Session> {
    await http().post('/auth/email/code').send({ email }).expect(202);
    const code = ctx.email.sent.at(-1)!.code;
    const response = await http().post('/auth/email/verify').send({ email, code }).expect(200);
    return response.body as Session;
  }

  const rowOf = (refreshToken: string) =>
    ctx.prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: createHash('sha256').update(refreshToken).digest('hex') },
    });

  describe('GET /auth/me', () => {
    it('returns the signed-in account with its role, status and creation date', async () => {
      const user = await createUser({ role: 'instructor' });
      const session = await signIn(user.email);

      const response = await me(session.accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: user.id,
        name: 'Ana Rocha',
        email: user.email,
        role: 'instructor',
        status: 'approved',
        createdAt: user.createdAt.toISOString(),
        whatsappNumber: null,
        whatsappVisible: false,
        rulesAccepted: true,
        rulesAcceptedBefore: false,
        denialReason: null,
        reactivationStatus: null,
      });
      expect(session.user.createdAt).toBe(user.createdAt.toISOString());
    });

    it('returns the stored WhatsApp number and visibility', async () => {
      const user = await ctx.prisma.user.create({
        data: {
          id: randomUUID(),
          name: 'Ana Rocha',
          email: uniqueEmail('ana'),
          status: 'approved',
          role: 'student',
          whatsappNumber: '+5585999998888',
          whatsappVisible: true,
        },
      });
      const session = await signIn(user.email!);

      expect(session.user).toMatchObject({ whatsappNumber: '+5585999998888', whatsappVisible: true });
      expect((await me(session.accessToken)).body).toMatchObject({
        whatsappNumber: '+5585999998888',
        whatsappVisible: true,
      });
    });

    it.each<Status>(['pending', 'approved', 'denied', 'deleted', 'removed'])(
      'answers 200 for a %s account',
      async (status) => {
        const user = await createUser({ status });
        const session = await signIn(user.email);

        const response = await me(session.accessToken);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(status);
      },
    );

    describe('closed account fields', () => {
      const CLOSED_AT = new Date('2026-10-01T10:00:00.000Z');

      async function meOf(data: {
        status: Status;
        denialReason?: string;
        reactivationStatus?: 'requested' | 'denied';
      }) {
        const user = await ctx.prisma.user.create({
          data: {
            id: randomUUID(),
            name: 'Ana Rocha',
            email: uniqueEmail('ana'),
            role: 'student',
            ...data,
            deniedAt: data.status === 'denied' ? CLOSED_AT : null,
            deletedAt: data.status === 'deleted' ? CLOSED_AT : null,
            reactivationRequestedAt: data.reactivationStatus ? CLOSED_AT : null,
          },
        });
        const session = await signIn(user.email!);
        const response = await me(session.accessToken).expect(200);
        return response.body as Record<string, unknown>;
      }

      function expectNoDates(body: Record<string, unknown>) {
        for (const field of ['deniedAt', 'deletedAt', 'removedAt', 'reactivationRequestedAt']) {
          expect(body).not.toHaveProperty(field);
        }
      }

      it('returns the reason of a denied account', async () => {
        const body = await meOf({ status: 'denied', denialReason: 'Unknown person' });

        expect(body).toMatchObject({
          status: 'denied',
          denialReason: 'Unknown person',
          reactivationStatus: null,
        });
        expectNoDates(body);
      });

      it('returns a null reason for a denied account without one', async () => {
        const body = await meOf({ status: 'denied' });

        expect(body).toMatchObject({ status: 'denied', denialReason: null, reactivationStatus: null });
        expectNoDates(body);
      });

      it.each(['requested', 'denied'] as const)(
        'returns the %s reactivation status of a deleted account',
        async (reactivationStatus) => {
          const body = await meOf({ status: 'deleted', reactivationStatus });

          expect(body).toMatchObject({ status: 'deleted', denialReason: null, reactivationStatus });
          expectNoDates(body);
        },
      );
    });
  });

  describe('rulesAccepted', () => {
    const asAdmin = (token: string, req: request.Test) => req.set('Authorization', `Bearer ${token}`);
    const accept = (userId: string, version: number) =>
      ctx.prisma.userRulesAcceptance.create({ data: { userId, version, acceptedAt: new Date() } });

    async function rulesAccepted(token: string): Promise<boolean> {
      return (await me(token).expect(200)).body.rulesAccepted as boolean;
    }

    it('is true while no rule was ever written', async () => {
      const user = await createUser();
      const session = await signIn(user.email);

      expect(await rulesAccepted(session.accessToken)).toBe(true);
    });

    it('follows the rules an admin changes', async () => {
      const admin = await createUser({ role: 'admin' });
      const adminToken = (await signIn(admin.email)).accessToken;
      const user = await createUser();
      const token = (await signIn(user.email)).accessToken;
      const write = async (req: request.Test) => (await asAdmin(adminToken, req)).body;

      const first = await write(
        http().post('/school-rules').send({ title: 'First', description: 'First rule' }),
      );
      expect(first.version).toBe(1);
      expect(await rulesAccepted(token)).toBe(false);

      await accept(user.id, 1);
      expect(await rulesAccepted(token)).toBe(true);

      const second = await write(
        http().post('/school-rules').send({ title: 'Second', description: 'Second rule' }),
      );
      expect(second.version).toBe(2);
      expect(await rulesAccepted(token)).toBe(false);

      await accept(user.id, 2);
      const [a, b] = second.rules as { id: string }[];
      const reordered = await write(http().put('/school-rules/order').send({ ruleIds: [b!.id, a!.id] }));
      expect(reordered.version).toBe(2);
      expect(await rulesAccepted(token)).toBe(true);

      const edited = await write(
        http().put(`/school-rules/${a!.id}`).send({ title: 'First, edited', description: 'New text' }),
      );
      expect(edited.version).toBe(3);
      expect(await rulesAccepted(token)).toBe(false);

      await accept(user.id, 3);
      const deleted = await write(http().delete(`/school-rules/${b!.id}`));
      expect(deleted.version).toBe(4);
      expect(await rulesAccepted(token)).toBe(false);
    });

    it('does not count an acceptance of an older version', async () => {
      const user = await createUser();
      const token = (await signIn(user.email)).accessToken;
      await ctx.prisma.rulesVersion.updateMany({ data: { version: 3 } });
      await accept(user.id, 2);

      expect(await rulesAccepted(token)).toBe(false);
    });

    it('is present for every status', async () => {
      await ctx.prisma.rulesVersion.updateMany({ data: { version: 1 } });
      const user = await createUser({ status: 'pending' });
      const token = (await signIn(user.email)).accessToken;

      expect((await me(token)).body.rulesAccepted).toBe(false);
    });

    it.each([
      [[2], true],
      [[1], false],
    ])('is carried by the refresh answer too (accepted %j)', async (accepted, expected) => {
      const user = await createUser();
      const session = await signIn(user.email);
      await ctx.prisma.rulesVersion.updateMany({ data: { version: 2 } });
      for (const version of accepted) await accept(user.id, version);

      const response = await refresh({ refreshToken: session.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.user.rulesAccepted).toBe(expected);
    });
  });

  describe('rulesAcceptedBefore', () => {
    const asAdmin = (token: string, req: request.Test) => req.set('Authorization', `Bearer ${token}`);
    const accept = (userId: string, version: number) =>
      ctx.prisma.userRulesAcceptance.create({ data: { userId, version, acceptedAt: new Date() } });

    async function flags(token: string) {
      const { rulesAccepted, rulesAcceptedBefore } = (await me(token).expect(200)).body;
      return { rulesAccepted, rulesAcceptedBefore };
    }

    it('is false without an acceptance, even while no rule was ever written', async () => {
      const user = await createUser();
      const token = (await signIn(user.email)).accessToken;

      expect(await flags(token)).toEqual({ rulesAccepted: true, rulesAcceptedBefore: false });
    });

    it('is false for a pending account without an acceptance', async () => {
      await ctx.prisma.rulesVersion.updateMany({ data: { version: 1 } });
      const user = await createUser({ status: 'pending' });
      const token = (await signIn(user.email)).accessToken;

      expect(await flags(token)).toEqual({ rulesAccepted: false, rulesAcceptedBefore: false });
    });

    it('follows the acceptances and the rules an admin changes', async () => {
      const admin = await createUser({ role: 'admin' });
      const adminToken = (await signIn(admin.email)).accessToken;
      const user = await createUser();
      const token = (await signIn(user.email)).accessToken;
      const write = async (req: request.Test) => (await asAdmin(adminToken, req)).body;

      const first = await write(
        http().post('/school-rules').send({ title: 'First', description: 'First rule' }),
      );
      expect(first.version).toBe(1);
      expect(await flags(token)).toEqual({ rulesAccepted: false, rulesAcceptedBefore: false });

      await accept(user.id, 1);
      expect(await flags(token)).toEqual({ rulesAccepted: true, rulesAcceptedBefore: true });

      const second = await write(
        http().post('/school-rules').send({ title: 'Second', description: 'Second rule' }),
      );
      expect(second.version).toBe(2);
      expect(await flags(token)).toEqual({ rulesAccepted: false, rulesAcceptedBefore: true });

      await accept(user.id, 2);
      const [a, b] = second.rules as { id: string }[];
      const reordered = await write(http().put('/school-rules/order').send({ ruleIds: [b!.id, a!.id] }));
      expect(reordered.version).toBe(2);
      expect(await flags(token)).toEqual({ rulesAccepted: true, rulesAcceptedBefore: true });
    });

    it('is carried by the refresh answer too', async () => {
      const user = await createUser();
      const session = await signIn(user.email);
      await ctx.prisma.rulesVersion.updateMany({ data: { version: 2 } });
      await accept(user.id, 1);

      const response = await refresh({ refreshToken: session.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({ rulesAccepted: false, rulesAcceptedBefore: true });
    });
  });

  describe('invalid access token', () => {
    const expectInvalid = (response: request.Response) => {
      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    };

    it('refuses a request without Authorization', async () => {
      expectInvalid(await me());
    });

    it('refuses a malformed token', async () => {
      expectInvalid(await me('not-a-jwt'));
    });

    it('refuses a token signed with another secret', async () => {
      const user = await createUser();
      const token = new JwtService({ secret: 'another-secret' }).sign({ sub: user.id, email: user.email });

      expectInvalid(await me(token));
    });

    it('refuses an expired token', async () => {
      const user = await createUser();
      const exp = Math.floor(Date.now() / 1000) - 60;
      const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: user.id,
        email: user.email,
        exp,
      });

      expectInvalid(await me(token));
    });

    it('refuses a valid token whose user was deleted from the database', async () => {
      const user = await createUser();
      const session = await signIn(user.email);
      await ctx.prisma.user.delete({ where: { id: user.id } });

      expectInvalid(await me(session.accessToken));
    });

    it('keeps public routes open without a token', async () => {
      await http().post('/auth/email/code').send({ email: uniqueEmail('ana') }).expect(202);
    });
  });

  describe('reloads role and status', () => {
    it('applies a database change to the next request with the same access token', async () => {
      const user = await createUser({ status: 'pending' });
      const session = await signIn(user.email);
      expect((await me(session.accessToken)).body).toMatchObject({
        status: 'pending',
        role: 'student',
      });

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { status: 'approved', role: 'instructor' },
      });

      const response = await me(session.accessToken);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'approved', role: 'instructor' });
    });
  });

  describe('POST /auth/refresh', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    it('rotates: issues a new session in the same family and revokes the sent token', async () => {
      const user = await createUser();
      const session = await signIn(user.email);
      const before = Date.now();

      const response = await refresh({ refreshToken: session.refreshToken });

      expect(response.status).toBe(200);
      const body = response.body as Session & {
        accessTokenExpiresAt: string;
        refreshTokenExpiresAt: string;
      };
      expect(body.refreshToken).not.toBe(session.refreshToken);
      expect(body.user).toEqual(session.user);
      expect(body.user).toMatchObject({ whatsappNumber: null, whatsappVisible: false });
      expect(Date.parse(body.accessTokenExpiresAt) - before).toBeGreaterThan(14 * 60 * 1000);
      const old = await rowOf(session.refreshToken);
      const next = await rowOf(body.refreshToken);
      expect(old.revokedAt).not.toBeNull();
      expect(next.revokedAt).toBeNull();
      expect(next.familyId).toBe(old.familyId);
      expect(Math.abs(next.expiresAt.getTime() - (before + 30 * DAY_MS))).toBeLessThan(60 * 1000);
      expect(Date.parse(body.refreshTokenExpiresAt)).toBe(next.expiresAt.getTime());
      await me(body.accessToken).expect(200);
    });

    it('rotates again with the new refresh token', async () => {
      const user = await createUser();
      const session = await signIn(user.email);
      const second = (await refresh({ refreshToken: session.refreshToken }).expect(200)).body as Session;

      await refresh({ refreshToken: second.refreshToken }).expect(200);
    });

    it.each<Status>(['pending', 'denied', 'deleted', 'removed'])(
      'rotates for a %s account',
      async (status) => {
        const user = await createUser({ status });
        const session = await signIn(user.email);

        const response = await refresh({ refreshToken: session.refreshToken });

        expect(response.status).toBe(200);
        expect(response.body.user.status).toBe(status);
      },
    );

    it('reuse of a rotated token revokes the whole family', async () => {
      const user = await createUser();
      const first = await signIn(user.email);
      const other = await signIn(user.email);
      const second = (await refresh({ refreshToken: first.refreshToken }).expect(200)).body as Session;

      const reused = await refresh({ refreshToken: first.refreshToken });

      expect(reused.status).toBe(401);
      expect(reused.body.errors).toEqual(['auth.refreshToken.invalid']);
      const afterReuse = await refresh({ refreshToken: second.refreshToken });
      expect(afterReuse.status).toBe(401);
      expect(afterReuse.body.errors).toEqual(['auth.refreshToken.invalid']);
      expect((await rowOf(second.refreshToken)).revokedAt).not.toBeNull();
      await refresh({ refreshToken: other.refreshToken }).expect(200);
    });

    it('reuse by two concurrent refreshes produces one 200 and one 401 and revokes the family', async () => {
      const user = await createUser();
      const session = await signIn(user.email);

      const responses = await Promise.all([
        refresh({ refreshToken: session.refreshToken }),
        refresh({ refreshToken: session.refreshToken }),
      ]);

      expect(responses.map((response) => response.status).sort((a, b) => a - b)).toEqual([200, 401]);
      const family = (await rowOf(session.refreshToken)).familyId;
      const rows = await ctx.prisma.refreshToken.findMany({ where: { familyId: family } });
      expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
    });

    describe('POST /auth/refresh refuses', () => {
      const expectInvalid = (response: request.Response) => {
        expect(response.status).toBe(401);
        expect(response.body.errors).toEqual(['auth.refreshToken.invalid']);
      };

      it('an unknown token', async () => {
        expectInvalid(await refresh({ refreshToken: 'never-issued' }));
      });

      it('an expired token', async () => {
        const user = await createUser();
        const session = await signIn(user.email);
        await ctx.prisma.refreshToken.updateMany({
          where: { userId: user.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });

        expectInvalid(await refresh({ refreshToken: session.refreshToken }));
        expect(await ctx.prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);
      });

      it('a token revoked by a sign-out', async () => {
        const user = await createUser();
        const session = await signIn(user.email);
        await signOut({ refreshToken: session.refreshToken }).expect(204);

        expectInvalid(await refresh({ refreshToken: session.refreshToken }));
      });

      it('a token whose user no longer exists', async () => {
        const user = await createUser();
        const session = await signIn(user.email);
        await ctx.prisma.user.delete({ where: { id: user.id } });

        expectInvalid(await refresh({ refreshToken: session.refreshToken }));
      });

      it.each([{}, { refreshToken: '' }, { refreshToken: 42 }, { refreshToken: null }])(
        'a body without a usable refreshToken (%j) with 422',
        async (body) => {
          const response = await refresh(body);

          expect(response.status).toBe(422);
          expect(response.body.errors).toEqual(['refreshToken.token.required']);
        },
      );

      it('the 11th request from one IP within 60 seconds with 429', async () => {
        for (let i = 0; i < 10; i++) {
          await refresh({ refreshToken: 'never-issued' }).expect(401);
        }

        const response = await refresh({ refreshToken: 'never-issued' });

        expect(response.status).toBe(429);
        expect(response.body.errors).toEqual(['request.rate.limited']);
      });
    });
  });

  describe('POST /auth/sign-out', () => {
    const activeRows = (familyId: string) =>
      ctx.prisma.refreshToken.count({ where: { familyId, revokedAt: null } });

    it('signs out one sign-in only: its family is revoked and the other family keeps working', async () => {
      const user = await createUser();
      const x = await signIn(user.email);
      const y = await signIn(user.email);
      const rotated = (await refresh({ refreshToken: x.refreshToken }).expect(200)).body as Session;
      const familyX = (await rowOf(x.refreshToken)).familyId;

      const response = await signOut({ refreshToken: rotated.refreshToken });

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(await activeRows(familyX)).toBe(0);
      const refused = await refresh({ refreshToken: rotated.refreshToken });
      expect(refused.status).toBe(401);
      expect(refused.body.errors).toEqual(['auth.refreshToken.invalid']);
      await refresh({ refreshToken: y.refreshToken }).expect(200);
    });

    it('signs out without Authorization and with an expired access token', async () => {
      const user = await createUser();
      const session = await signIn(user.email);
      const expired = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      await signOut({ refreshToken: session.refreshToken })
        .set('Authorization', `Bearer ${expired}`)
        .expect(204);

      expect(await activeRows((await rowOf(session.refreshToken)).familyId)).toBe(0);
    });

    describe('sign-out is idempotent', () => {
      it('answers 204 for an unknown token', async () => {
        await signOut({ refreshToken: 'never-issued' }).expect(204);
      });

      it('answers 204 for an already-revoked token and leaves the rows unchanged', async () => {
        const user = await createUser();
        const session = await signIn(user.email);
        await signOut({ refreshToken: session.refreshToken }).expect(204);
        const before = await rowOf(session.refreshToken);

        await signOut({ refreshToken: session.refreshToken }).expect(204);

        const after = await rowOf(session.refreshToken);
        expect(after.revokedAt).toEqual(before.revokedAt);
      });

      it('answers 204 for an expired token and leaves the rows unchanged', async () => {
        const user = await createUser();
        const session = await signIn(user.email);
        await ctx.prisma.refreshToken.updateMany({
          where: { userId: user.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });

        await signOut({ refreshToken: session.refreshToken }).expect(204);

        expect((await rowOf(session.refreshToken)).revokedAt).toBeNull();
      });

      it.each([{}, { refreshToken: '' }, { refreshToken: 42 }, { refreshToken: null }])(
        'refuses a body without a usable refreshToken (%j) with 422',
        async (body) => {
          const response = await signOut(body);

          expect(response.status).toBe(422);
          expect(response.body.errors).toEqual(['refreshToken.token.required']);
        },
      );

      it('answers the 11th request from one IP within 60 seconds with 429', async () => {
        for (let i = 0; i < 10; i++) {
          await signOut({ refreshToken: 'never-issued' }).expect(204);
        }

        const response = await signOut({ refreshToken: 'never-issued' });

        expect(response.status).toBe(429);
        expect(response.body.errors).toEqual(['request.rate.limited']);
      });
    });
  });
});
