import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
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
  await prisma.signInCode.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
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

  describe('request code', () => {
    it('sends a 6-digit code and stores only its hash', async () => {
      const email = uniqueEmail('ana');
      const before = Date.now();

      const response = await requestCode({ email: `  ${email.toUpperCase()} `, locale: 'es' });

      expect(response.status).toBe(202);
      const resendAvailableAt = Date.parse(response.body.resendAvailableAt as string);
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
      const withoutAccount = await requestCode({ email: uniqueEmail('nobody'), locale: 'en' });

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
      await expect(ctx.prisma.signInCode.findUnique({ where: { email } })).resolves.toBeNull();
    });
  });

  describe('too soon', () => {
    it('answers 429 with resendAvailableAt and sends nothing', async () => {
      const email = uniqueEmail('ana');
      const first = await requestCode({ email }).expect(202);

      const response = await requestCode({ email });

      expect(response.status).toBe(429);
      expect(response.body.errors).toEqual(['signInCode.resend.tooSoon']);
      expect(response.body.details).toEqual({ resendAvailableAt: first.body.resendAvailableAt });
      expect(ctx.email.sent).toHaveLength(1);
    });
  });

  describe('send fails', () => {
    it('answers 502, leaves no row, and accepts a new request at once', async () => {
      const email = uniqueEmail('ana');
      ctx.email.failing = true;

      const failed = await requestCode({ email });

      expect(failed.status).toBe(502);
      expect(failed.body.errors).toEqual(['signInCode.email.sendFailed']);
      await expect(ctx.prisma.signInCode.findUnique({ where: { email } })).resolves.toBeNull();

      ctx.email.failing = false;
      await requestCode({ email }).expect(202);
      expect(ctx.email.sent).toHaveLength(1);
    });
  });
});
