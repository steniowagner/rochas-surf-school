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
    });
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
      });
      expect(session.user.createdAt).toBe(user.createdAt.toISOString());
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
});
