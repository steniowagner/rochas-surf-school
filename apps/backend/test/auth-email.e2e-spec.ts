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

const DOMAIN = 'e2e.example.com';
const REVIEW_ADMIN = `review.admin@${DOMAIN}`;
process.env.REVIEW_ACCOUNTS = JSON.stringify([
  { email: REVIEW_ADMIN, code: '246810', role: 'admin', name: 'Review Admin' },
]);

/** Captures the emails instead of sending them through Resend (D-18). */
class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];
  failing = false;

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    if (this.failing) {
      throw new Error('email provider unavailable');
    }
    this.sent.push(input);
  }
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

async function cleanUp(prisma: PrismaService): Promise<void> {
  await prisma.signInCode.deleteMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: `@${DOMAIN}` } },
  });
}

describe('Email sign-in (e2e)', () => {
  let ctx: Context;

  beforeEach(async () => {
    ctx = await createApp();
  });

  afterEach(async () => {
    await cleanUp(ctx.prisma);
    await ctx.app.close();
  });

  const requestCode = (body: object) =>
    request(ctx.app.getHttpServer()).post('/auth/email/code').send(body);
  const verify = (body: object) =>
    request(ctx.app.getHttpServer()).post('/auth/email/verify').send(body);

  /** Requests a code for `email` and returns the code the fake email provider received. */
  async function codeFor(email: string): Promise<string> {
    await requestCode({ email }).expect(202);
    return ctx.email.sent.at(-1)!.code;
  }

  const wrongCode = (code: string) => (code === '999999' ? '999998' : '999999');

  function createUser(
    email: string,
    data: Partial<{
      name: string;
      status: 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
      role: 'student' | 'instructor' | 'admin';
    }> = {},
  ) {
    return ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email,
        status: 'approved',
        ...data,
      },
    });
  }

  describe('request code', () => {
    it('sends a 6-digit code and stores only its hash', async () => {
      const email = uniqueEmail('ana');
      const before = Date.now();

      const response = await requestCode({
        email: `  ${email.toUpperCase()} `,
        locale: 'es',
      });

      expect(response.status).toBe(202);
      const resendAvailableAt = Date.parse(
        response.body.resendAvailableAt as string,
      );
      const expiresAt = Date.parse(response.body.expiresAt as string);
      expect(expiresAt - resendAvailableAt).toBe(10 * 60 * 1000 - 30 * 1000);
      expect(resendAvailableAt - before).toBeGreaterThanOrEqual(30 * 1000);
      expect(ctx.email.sent).toHaveLength(1);
      expect(ctx.email.sent[0]).toMatchObject({ to: email, locale: 'es' });
      const code = ctx.email.sent[0]!.code;
      expect(code).toMatch(/^\d{6}$/);
      const row = await ctx.prisma.signInCode.findUnique({ where: { email } });
      expect(row?.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row?.codeHash).not.toContain(code);
      expect(row?.attempts).toBe(0);
    });

    it('answers the same whether or not an account exists', async () => {
      const existing = uniqueEmail('ana');
      await ctx.prisma.user.create({
        data: { id: randomUUID(), name: 'Ana Rocha', email: existing },
      });

      const withAccount = await requestCode({ email: existing, locale: 'en' });
      const withoutAccount = await requestCode({
        email: uniqueEmail('nobody'),
        locale: 'en',
      });

      expect(withAccount.status).toBe(202);
      expect(withoutAccount.status).toBe(202);
      expect(Object.keys(withAccount.body as object).sort()).toEqual(
        Object.keys(withoutAccount.body as object).sort(),
      );
    });

    it('sends in pt-BR when no locale is given', async () => {
      await requestCode({ email: uniqueEmail('ana') }).expect(202);

      expect(ctx.email.sent[0]?.locale).toBe('pt-BR');
    });

    it('rejects an invalid email with 422 and sends nothing', async () => {
      const response = await requestCode({ email: 'ana@', locale: 'en' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['signInCode.email.invalid']);
      expect(ctx.email.sent).toHaveLength(0);
    });

    it('rejects an unknown locale with 422 and sends nothing', async () => {
      const email = uniqueEmail('ana');

      const response = await requestCode({ email, locale: 'fr' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['signInCode.locale.invalid']);
      expect(ctx.email.sent).toHaveLength(0);
      await expect(
        ctx.prisma.signInCode.findUnique({ where: { email } }),
      ).resolves.toBeNull();
    });
  });

  describe('too soon', () => {
    it('answers 429 with resendAvailableAt and sends nothing', async () => {
      const email = uniqueEmail('ana');
      const first = await requestCode({ email }).expect(202);

      const response = await requestCode({ email });

      expect(response.status).toBe(429);
      expect(response.body.errors).toEqual(['signInCode.resend.tooSoon']);
      expect(response.body.details).toEqual({
        resendAvailableAt: first.body.resendAvailableAt,
      });
      expect(ctx.email.sent).toHaveLength(1);

      await createUser(email);
      await verify({ email, code: ctx.email.sent[0]!.code }).expect(200);
    });
  });

  describe('send fails', () => {
    it('answers 502, leaves no row, and accepts a new request at once', async () => {
      const email = uniqueEmail('ana');
      ctx.email.failing = true;

      const failed = await requestCode({ email });

      expect(failed.status).toBe(502);
      expect(failed.body.errors).toEqual(['signInCode.email.sendFailed']);
      await expect(
        ctx.prisma.signInCode.findUnique({ where: { email } }),
      ).resolves.toBeNull();

      ctx.email.failing = false;
      await requestCode({ email }).expect(202);
      expect(ctx.email.sent).toHaveLength(1);
    });
  });

  describe('existing account', () => {
    it('signs in with the correct code and deletes it', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      const code = await codeFor(email);

      const response = await verify({
        email: ` ${email.toUpperCase()} `,
        code,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
        accessTokenExpiresAt: expect.any(String),
        refreshToken: expect.any(String),
        refreshTokenExpiresAt: expect.any(String),
        user: {
          id: user.id,
          name: 'Ana Rocha',
          email,
          role: 'student',
          status: 'approved',
        },
      });
      await expect(
        ctx.prisma.signInCode.findUnique({ where: { email } }),
      ).resolves.toBeNull();
    });

    it('adds an email identity to a Google account without creating a second one', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      await ctx.prisma.identity.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          provider: 'google',
          providerUserId: randomUUID(),
          email,
        },
      });

      await verify({ email, code: await codeFor(email) }).expect(200);

      await expect(ctx.prisma.user.count({ where: { email } })).resolves.toBe(
        1,
      );
      const identities = await ctx.prisma.identity.findMany({
        where: { userId: user.id },
      });
      expect(identities.map((identity) => identity.provider).sort()).toEqual([
        'email',
        'google',
      ]);
      expect(
        identities.find((identity) => identity.provider === 'email')
          ?.providerUserId,
      ).toBe(email);
    });

    it('does not duplicate an existing email identity', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      await ctx.prisma.identity.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          provider: 'email',
          providerUserId: email,
          email,
        },
      });

      await verify({ email, code: await codeFor(email) }).expect(200);

      await expect(
        ctx.prisma.identity.count({ where: { userId: user.id } }),
      ).resolves.toBe(1);
    });

    it.each(['denied', 'deleted', 'removed'] as const)(
      'signs in a %s account and returns its status',
      async (status) => {
        const email = uniqueEmail('ana');
        await createUser(email, { status });

        const response = await verify({ email, code: await codeFor(email) });

        expect(response.status).toBe(200);
        expect(response.body.user.status).toBe(status);
      },
    );
  });

  describe('new account', () => {
    it('asks for the name first, then creates a pending student', async () => {
      const email = uniqueEmail('bia');
      const code = await codeFor(email);

      const missing = await verify({ email, code });

      expect(missing.status).toBe(422);
      expect(missing.body.errors).toEqual(['user.name.required']);
      await expect(ctx.prisma.user.count({ where: { email } })).resolves.toBe(
        0,
      );
      expect(
        (await ctx.prisma.signInCode.findUnique({ where: { email } }))
          ?.attempts,
      ).toBe(0);

      const response = await verify({ email, code, name: 'Bia Souza' });

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        name: 'Bia Souza',
        email,
        role: 'student',
        status: 'pending',
      });
      const identities = await ctx.prisma.identity.findMany({
        where: { userId: response.body.user.id as string },
      });
      expect(identities).toEqual([
        expect.objectContaining({ provider: 'email', providerUserId: email }),
      ]);
      await expect(
        ctx.prisma.signInCode.findUnique({ where: { email } }),
      ).resolves.toBeNull();
    });

    it('rejects a short name without consuming the code', async () => {
      const email = uniqueEmail('bia');
      const code = await codeFor(email);

      const response = await verify({ email, code, name: 'Al' });

      expect(response.status).toBe(422);
      expect(response.body.errors[0]).toBe('user.name.min.length');
      await expect(ctx.prisma.user.count({ where: { email } })).resolves.toBe(
        0,
      );
      await verify({ email, code, name: 'Bia Souza' }).expect(200);
    });

    it('answers 401 to a wrong code with a name and creates nothing', async () => {
      const email = uniqueEmail('bia');
      const code = await codeFor(email);

      const response = await verify({
        email,
        code: wrongCode(code),
        name: 'Bia Souza',
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.code.invalid']);
      await expect(ctx.prisma.user.count({ where: { email } })).resolves.toBe(
        0,
      );
    });
  });

  describe('wrong code', () => {
    it('answers 401, returns no session and counts an attempt', async () => {
      const email = uniqueEmail('ana');
      await createUser(email);
      const code = await codeFor(email);

      const response = await verify({ email, code: wrongCode(code) });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.code.invalid']);
      expect(response.body.accessToken).toBeUndefined();
      expect(
        (await ctx.prisma.signInCode.findUnique({ where: { email } }))
          ?.attempts,
      ).toBe(1);
    });

    it('answers the same 401 when no code was requested', async () => {
      const response = await verify({
        email: uniqueEmail('ana'),
        code: '123456',
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.code.invalid']);
    });

    it('treats a code that is not 6 digits as a wrong code', async () => {
      const email = uniqueEmail('ana');
      await codeFor(email);

      const response = await verify({ email, code: '12ab' });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.code.invalid']);
      expect(
        (await ctx.prisma.signInCode.findUnique({ where: { email } }))
          ?.attempts,
      ).toBe(1);
    });
  });

  describe('lockout', () => {
    it('locks the code after 5 wrong guesses', async () => {
      const email = uniqueEmail('ana');
      await createUser(email);
      const code = await codeFor(email);
      for (let i = 0; i < 5; i++) {
        await verify({ email, code: wrongCode(code) }).expect(401);
      }

      const response = await verify({ email, code });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.attempts.exceeded']);
    });

    it('still signs in after 4 wrong guesses', async () => {
      const email = uniqueEmail('ana');
      await createUser(email);
      const code = await codeFor(email);
      for (let i = 0; i < 4; i++) {
        await verify({ email, code: wrongCode(code) }).expect(401);
      }

      await verify({ email, code }).expect(200);
    });
  });

  describe('single use', () => {
    it('answers 401 to a code that already signed in', async () => {
      const email = uniqueEmail('ana');
      await createUser(email);
      const code = await codeFor(email);
      await verify({ email, code }).expect(200);

      const response = await verify({ email, code });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.code.invalid']);
    });

    it('gives one session to two concurrent verifies', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      const code = await codeFor(email);

      const responses = await Promise.all([
        verify({ email, code }),
        verify({ email, code }),
      ]);

      expect(
        responses.map((response) => response.status).sort((a, b) => a - b),
      ).toEqual([200, 401]);
      await expect(
        ctx.prisma.refreshToken.count({ where: { userId: user.id } }),
      ).resolves.toBe(1);
    });
  });

  describe('review account', () => {
    it('signs in with the fixed code without sending an email', async () => {
      const admin = await createUser(REVIEW_ADMIN, {
        name: 'Review Admin',
        role: 'admin',
      });

      await requestCode({ email: REVIEW_ADMIN }).expect(202);
      const response = await verify({ email: REVIEW_ADMIN, code: '246810' });

      expect(ctx.email.sent).toHaveLength(0);
      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: admin.id,
        name: 'Review Admin',
        email: REVIEW_ADMIN,
        role: 'admin',
        status: 'approved',
      });
    });

    it('rejects the fixed code for another email and before a code is requested', async () => {
      await createUser(REVIEW_ADMIN, { name: 'Review Admin', role: 'admin' });
      const other = uniqueEmail('ana');
      await codeFor(other);

      const forOther = await verify({ email: other, code: '246810' });
      const beforeRequest = await verify({
        email: REVIEW_ADMIN,
        code: '246810',
      });

      expect(forOther.status).toBe(401);
      expect(forOther.body.errors).toEqual(['signInCode.code.invalid']);
      expect(beforeRequest.status).toBe(401);
      expect(beforeRequest.body.errors).toEqual(['signInCode.code.invalid']);
    });

    it('applies the cooldown and the lockout', async () => {
      await createUser(REVIEW_ADMIN, { name: 'Review Admin', role: 'admin' });
      await requestCode({ email: REVIEW_ADMIN }).expect(202);

      await requestCode({ email: REVIEW_ADMIN }).expect(429);
      for (let i = 0; i < 5; i++) {
        await verify({ email: REVIEW_ADMIN, code: '000000' }).expect(401);
      }
      const response = await verify({ email: REVIEW_ADMIN, code: '246810' });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['signInCode.attempts.exceeded']);
    });
  });

  describe('session', () => {
    it('returns a 15-minute HS256 access JWT and stores only the refresh token hash', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      const before = Date.now();

      const response = await verify({
        email,
        code: await codeFor(email),
      }).expect(200);

      const accessToken = response.body.accessToken as string;
      const header = JSON.parse(
        Buffer.from(accessToken.split('.')[0]!, 'base64url').toString(),
      ) as { alg: string };
      expect(header.alg).toBe('HS256');
      const payload = new JwtService().verify<{
        sub: string;
        iat: number;
        exp: number;
      }>(accessToken, {
        secret: process.env.JWT_SECRET,
      });
      expect(payload.sub).toBe(user.id);
      expect(payload.exp - payload.iat).toBe(15 * 60);
      expect(Date.parse(response.body.accessTokenExpiresAt as string)).toBe(
        payload.exp * 1000,
      );

      const refreshToken = response.body.refreshToken as string;
      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.tokenHash).toBe(
        createHash('sha256').update(refreshToken).digest('hex'),
      );
      expect(rows[0]!.tokenHash).not.toBe(refreshToken);
      expect(rows[0]!.familyId).toMatch(/^[0-9a-f-]{36}$/);
      const expiresAt = rows[0]!.expiresAt.getTime();
      expect(expiresAt).toBe(
        Date.parse(response.body.refreshTokenExpiresAt as string),
      );
      expect(expiresAt - before).toBeGreaterThanOrEqual(
        30 * 24 * 60 * 60 * 1000,
      );
      expect(expiresAt - before).toBeLessThan(
        30 * 24 * 60 * 60 * 1000 + 60 * 1000,
      );
    });

    it('creates one refresh token per sign-in, each in its own family', async () => {
      const email = uniqueEmail('ana');
      const user = await createUser(email);
      await verify({ email, code: await codeFor(email) }).expect(200);
      await verify({ email, code: await codeFor(email) }).expect(200);

      const rows = await ctx.prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(rows).toHaveLength(2);
      expect(rows[0]!.familyId).not.toBe(rows[1]!.familyId);
    });
  });
});
