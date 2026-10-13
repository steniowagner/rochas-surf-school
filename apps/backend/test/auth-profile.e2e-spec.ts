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
