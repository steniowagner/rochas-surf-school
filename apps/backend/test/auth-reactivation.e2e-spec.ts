import { randomUUID } from 'node:crypto';
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

const DOMAIN = 'reactivation.e2e.example.com';

/** Captures the emails instead of sending them through Resend. */
class CapturingEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    this.sent.push(input);
  }
}

type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';
type Role = 'student' | 'instructor' | 'admin';
type ReactivationStatus = 'requested' | 'denied';

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

describe('POST /auth/me/reactivation-request (e2e)', () => {
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

  /** Creates an account in the given state through Prisma and signs it in through the email flow. */
  async function createUser(
    data: Partial<{
      status: Status;
      role: Role;
      reactivationStatus: ReactivationStatus;
      reactivationRequestedAt: Date;
    }> = {},
  ) {
    const status = data.status ?? 'deleted';
    const user = await ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: uniqueEmail('ana'),
        role: data.role ?? 'student',
        status,
        deletedAt: status === 'deleted' ? new Date('2026-10-01T10:00:00.000Z') : null,
        reactivationStatus: data.reactivationStatus ?? null,
        reactivationRequestedAt: data.reactivationRequestedAt ?? null,
      },
    });
    await http().post('/auth/email/code').send({ email: user.email }).expect(202);
    const code = ctx.email.sent.at(-1)!.code;
    const verified = await http().post('/auth/email/verify').send({ email: user.email, code }).expect(200);
    return { user, accessToken: verified.body.accessToken as string };
  }

  const send = (accessToken: string | undefined, body?: object) => {
    const req = http().post('/auth/me/reactivation-request');
    const authorized = accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
    return body === undefined ? authorized : authorized.send(body);
  };
  const rowOf = (id: string) => ctx.prisma.user.findUniqueOrThrow({ where: { id } });

  describe('sends the request', () => {
    it.each<Role>(['student', 'instructor', 'admin'])(
      'stores the request of a deleted %s and answers the account',
      async (role) => {
        const { user, accessToken } = await createUser({ role });
        const before = Date.now();

        const response = await send(accessToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          id: user.id,
          name: 'Ana Rocha',
          email: user.email,
          role,
          status: 'deleted',
          createdAt: user.createdAt.toISOString(),
          photoUrl: null,
          whatsappNumber: null,
          whatsappVisible: false,
          rulesAccepted: true,
          rulesAcceptedBefore: false,
          denialReason: null,
          reactivationStatus: 'requested',
        });
        const row = await rowOf(user.id);
        expect(row.status).toBe('deleted');
        expect(row.reactivationStatus).toBe('requested');
        expect(Math.abs(row.reactivationRequestedAt!.getTime() - before)).toBeLessThan(60 * 1000);
      },
    );

    it('ignores any body', async () => {
      const { user, accessToken } = await createUser();

      const response = await send(accessToken, { reactivationStatus: 'denied', status: 'approved' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'deleted', reactivationStatus: 'requested' });
      expect((await rowOf(user.id)).reactivationStatus).toBe('requested');
    });
  });

  describe('already requested', () => {
    it('answers 200 and keeps the first request date', async () => {
      const first = new Date('2026-10-02T08:00:00.000Z');
      const { user, accessToken } = await createUser({
        reactivationStatus: 'requested',
        reactivationRequestedAt: first,
      });

      const response = await send(accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'deleted', reactivationStatus: 'requested' });
      const row = await rowOf(user.id);
      expect(row.reactivationStatus).toBe('requested');
      expect(row.reactivationRequestedAt).toEqual(first);
    });

    it('answers 200 to two requests sent at the same moment', async () => {
      const { user, accessToken } = await createUser();

      const responses = await Promise.all([send(accessToken), send(accessToken)]);

      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      for (const response of responses) {
        expect(response.body.reactivationStatus).toBe('requested');
      }
      expect((await rowOf(user.id)).reactivationStatus).toBe('requested');
    });
  });

  it('request denied: answers 409 and leaves the row unchanged', async () => {
    const requestedAt = new Date('2026-10-02T08:00:00.000Z');
    const { user, accessToken } = await createUser({
      reactivationStatus: 'denied',
      reactivationRequestedAt: requestedAt,
    });

    const response = await send(accessToken);

    expect(response.status).toBe(409);
    expect(response.body.errors).toEqual(['user.reactivation.denied']);
    const row = await rowOf(user.id);
    expect(row.reactivationStatus).toBe('denied');
    expect(row.reactivationRequestedAt).toEqual(requestedAt);
  });

  describe('not deleted', () => {
    it.each<Status>(['pending', 'approved', 'denied', 'removed'])(
      'answers 403 to a %s account and stores nothing',
      async (status) => {
        const { user, accessToken } = await createUser({ status });

        const response = await send(accessToken);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notDeleted']);
        const row = await rowOf(user.id);
        expect(row.status).toBe(status);
        expect(row.reactivationStatus).toBeNull();
        expect(row.reactivationRequestedAt).toBeNull();
      },
    );

    it('answers 403 to a removed account whose reactivation was denied', async () => {
      const { user, accessToken } = await createUser({ status: 'removed', reactivationStatus: 'denied' });

      const response = await send(accessToken);

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.status.notDeleted']);
      expect((await rowOf(user.id)).reactivationStatus).toBe('denied');
    });
  });

  describe('without a valid token', () => {
    const expectInvalid = (response: request.Response) => {
      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    };

    it('refuses a request without Authorization', async () => {
      expectInvalid(await send(undefined));
    });

    it('refuses a malformed token', async () => {
      expectInvalid(await send('not-a-jwt'));
    });

    it('refuses an expired token', async () => {
      const { user } = await createUser();
      const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      expectInvalid(await send(token));
      expect((await rowOf(user.id)).reactivationStatus).toBeNull();
    });

    it('refuses a token whose account no longer exists', async () => {
      const { user, accessToken } = await createUser();
      await ctx.prisma.user.delete({ where: { id: user.id } });

      expectInvalid(await send(accessToken));
    });
  });
});
