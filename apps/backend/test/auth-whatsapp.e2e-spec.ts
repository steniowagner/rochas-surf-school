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

const DOMAIN = 'whatsapp.e2e.example.com';

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

describe('PUT /auth/me/whatsapp (e2e)', () => {
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
    const req = http().put('/auth/me/whatsapp');
    const authorized = accessToken === undefined ? req : req.set('Authorization', `Bearer ${accessToken}`);
    return body === undefined ? authorized : authorized.send(body);
  };
  const me = (accessToken: string) => http().get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

  async function expectUnchanged(accessToken: string, before: object) {
    expect((await me(accessToken)).body).toEqual(before);
  }

  it('saves the number and the visibility of an approved account', async () => {
    const { user, accessToken } = await createUser();

    const response = await save(accessToken, { whatsappNumber: '+5585999998888', whatsappVisible: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      name: 'Ana Rocha',
      email: user.email,
      role: 'student',
      status: 'approved',
      createdAt: user.createdAt.toISOString(),
      whatsappNumber: '+5585999998888',
      whatsappVisible: false,
      rulesAccepted: true,
      rulesAcceptedBefore: false,
    });
    expect((await me(accessToken)).body).toMatchObject({
      whatsappNumber: '+5585999998888',
      whatsappVisible: false,
    });
  });

  it.each([
    ['accepted the current version', 2, true],
    ['accepted only an older version', 1, false],
  ])('says rulesAccepted for an account that %s', async (_label, accepted, expected) => {
    const { user, accessToken } = await createUser();
    await ctx.prisma.rulesVersion.updateMany({ data: { version: 2 } });
    await ctx.prisma.userRulesAcceptance.create({
      data: { userId: user.id, version: accepted, acceptedAt: new Date() },
    });

    const response = await save(accessToken, { whatsappNumber: '+5585999998888', whatsappVisible: false });

    expect(response.status).toBe(200);
    expect(response.body.rulesAccepted).toBe(expected);
  });

  it('replaces both values when it is called again', async () => {
    const { accessToken } = await createUser();
    await save(accessToken, { whatsappNumber: '+5585999998888', whatsappVisible: false }).expect(200);

    const response = await save(accessToken, { whatsappNumber: '+351912345678', whatsappVisible: true });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ whatsappNumber: '+351912345678', whatsappVisible: true });
    expect((await me(accessToken)).body).toMatchObject({
      whatsappNumber: '+351912345678',
      whatsappVisible: true,
    });
  });

  it('lets another account save the same number', async () => {
    const first = await createUser();
    const second = await createUser();
    const body = { whatsappNumber: '+5585999998888', whatsappVisible: false };

    await save(first.accessToken, body).expect(200);
    const response = await save(second.accessToken, body);

    expect(response.status).toBe(200);
    expect(response.body.whatsappNumber).toBe('+5585999998888');
  });

  it('refuses a pending account', async () => {
    const { user, accessToken } = await createUser('pending');

    const response = await save(accessToken, { whatsappNumber: '+5585999998888', whatsappVisible: false });

    expect(response.status).toBe(403);
    expect(response.body.errors).toEqual(['user.status.notApproved']);
    const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.whatsappNumber).toBeNull();
  });

  it('refuses without a token', async () => {
    const response = await save(undefined, { whatsappNumber: '+5585999998888', whatsappVisible: false });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.token.invalid']);
  });

  it('refuses an invalid token', async () => {
    const response = await save('not-a-jwt', { whatsappNumber: '+5585999998888', whatsappVisible: false });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.token.invalid']);
  });

  describe('invalid input', () => {
    it.each([
      ['a missing number', { whatsappVisible: false }, 'user.whatsappNumber.required'],
      ['an empty number', { whatsappNumber: '', whatsappVisible: false }, 'user.whatsappNumber.required'],
      ['a formatted number', { whatsappNumber: '+55 (85) 99999-8888', whatsappVisible: false }, 'user.whatsappNumber.phone'],
      ['a number with an extension', { whatsappNumber: '+5585999998888 ext. 12', whatsappVisible: false }, 'user.whatsappNumber.phone'],
      ['a number with a trailing space', { whatsappNumber: '+5585999998888 ', whatsappVisible: false }, 'user.whatsappNumber.phone'],
      ['an invalid number', { whatsappNumber: '+55123', whatsappVisible: false }, 'user.whatsappNumber.phone'],
      ['a missing visibility', { whatsappNumber: '+5585999998888' }, 'user.whatsappVisible.required'],
      [
        'a non-boolean visibility',
        { whatsappNumber: '+5585999998888', whatsappVisible: 'yes' },
        'user.whatsappVisible.in',
      ],
    ])('answers 422 for %s and saves nothing', async (_name, body, key) => {
      const { accessToken } = await createUser();
      const before = (await me(accessToken)).body as object;

      const response = await save(accessToken, body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toContain(key);
      await expectUnchanged(accessToken, before);
    });

    it('answers 422 for a missing body', async () => {
      const { accessToken } = await createUser();

      const response = await save(accessToken);

      expect(response.status).toBe(422);
      expect(response.body.errors).toContain('user.whatsappNumber.required');
    });

    it('keeps the stored number when an empty one is sent', async () => {
      const { accessToken } = await createUser();
      await save(accessToken, { whatsappNumber: '+5585999998888', whatsappVisible: true }).expect(200);
      const before = (await me(accessToken)).body as object;

      const response = await save(accessToken, { whatsappNumber: '', whatsappVisible: false });

      expect(response.status).toBe(422);
      expect(response.body.errors).toContain('user.whatsappNumber.required');
      await expectUnchanged(accessToken, before);
    });
  });
});
