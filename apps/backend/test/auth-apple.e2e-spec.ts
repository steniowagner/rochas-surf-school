import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppleIdTokenPayload } from '@rochas-surf-school/auth';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { AppleAuthIdTokenProvider } from '../src/modules/auth/apple.id-token.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'apple-e2e.example.com';

/** Maps test tokens to payloads instead of calling Apple (D-14). */
class FakeAppleIdTokenProvider {
  readonly payloads = new Map<string, AppleIdTokenPayload>();
  readonly calls: string[] = [];

  async verify(idToken: string): Promise<AppleIdTokenPayload> {
    this.calls.push(idToken);
    const payload = this.payloads.get(idToken);
    if (!payload) {
      throw new Error('invalid token');
    }
    return payload;
  }
}

interface Context {
  app: INestApplication<App>;
  prisma: PrismaService;
  apple: FakeAppleIdTokenProvider;
}

async function createApp(): Promise<Context> {
  const apple = new FakeAppleIdTokenProvider();
  const moduleRef = await Test.createTestingModule({
    imports: [(await import('../src/app.module.js')).AppModule],
  })
    .overrideProvider(AppleAuthIdTokenProvider)
    .useValue(apple)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return { app, prisma: app.get(PrismaService), apple };
}

function uniqueEmail(name: string): string {
  return `${name}.${randomUUID().slice(0, 8)}@${DOMAIN}`;
}

describe('Apple sign-in (e2e)', () => {
  let ctx: Context;
  const relayEmails: string[] = [];

  beforeEach(async () => {
    ctx = await createApp();
  });

  afterEach(async () => {
    // Identities and refresh tokens go with their user (onDelete: Cascade).
    await ctx.prisma.user.deleteMany({
      where: {
        OR: [
          { email: { endsWith: `@${DOMAIN}` } },
          { email: { in: relayEmails } },
        ],
      },
    });
    await ctx.app.close();
  });

  const signIn = (body: object) =>
    request(ctx.app.getHttpServer()).post('/auth/apple').send(body);

  function token(payload: Partial<AppleIdTokenPayload>): string {
    const idToken = `token-${randomUUID()}`;
    ctx.apple.payloads.set(idToken, {
      sub: `sub-${randomUUID()}`,
      emailVerified: true,
      ...payload,
    });
    return idToken;
  }

  const counts = async (email: string) => ({
    users: await ctx.prisma.user.count({ where: { email } }),
    identities: await ctx.prisma.identity.count({ where: { user: { email } } }),
    refreshTokens: await ctx.prisma.refreshToken.count({
      where: { user: { email } },
    }),
  });

  it('creates a pending account', async () => {
    const email = uniqueEmail('maria');
    const sub = `sub-${randomUUID()}`;

    const response = await signIn({
      idToken: token({ email: email.toUpperCase(), sub }),
      name: '  Maria Silva ',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      name: 'Maria Silva',
      email,
      role: 'student',
      status: 'pending',
    });
    const identities = await ctx.prisma.identity.findMany({
      where: { user: { email } },
    });
    expect(identities).toHaveLength(1);
    expect(identities[0]).toMatchObject({
      provider: 'apple',
      providerUserId: sub,
      userId: response.body.user.id,
    });
    await expect(counts(email)).resolves.toEqual({
      users: 1,
      identities: 1,
      refreshTokens: 1,
    });
  });

  it('links an email account', async () => {
    const email = uniqueEmail('ana');
    const user = await ctx.prisma.user.create({
      data: { id: randomUUID(), name: 'Ana Rocha', email, status: 'approved' },
    });
    const sub = `sub-${randomUUID()}`;

    const response = await signIn({
      idToken: token({ email: email.replace('ana', 'Ana').toUpperCase(), sub }),
      name: 'Someone Else',
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: user.id,
      name: 'Ana Rocha',
      status: 'approved',
    });
    const identities = await ctx.prisma.identity.findMany({
      where: { userId: user.id },
    });
    expect(
      identities.map((item) => [item.provider, item.providerUserId]),
    ).toEqual([['apple', sub]]);
    await expect(counts(email)).resolves.toMatchObject({
      users: 1,
      identities: 1,
    });
  });

  it('signs in a known identity', async () => {
    const oldEmail = uniqueEmail('old');
    const newEmail = uniqueEmail('new');
    const user = await ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: oldEmail,
        status: 'approved',
      },
    });
    const sub = `sub-${randomUUID()}`;
    await ctx.prisma.identity.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        provider: 'apple',
        providerUserId: sub,
        email: oldEmail,
      },
    });

    const noEmail = await signIn({
      idToken: token({ sub, emailVerified: false }),
    });
    const otherEmail = await signIn({
      idToken: token({ sub, email: newEmail }),
    });

    expect(noEmail.status).toBe(200);
    expect(noEmail.body.user).toMatchObject({ id: user.id, email: oldEmail });
    expect(otherEmail.status).toBe(200);
    expect(otherEmail.body.user).toMatchObject({
      id: user.id,
      email: oldEmail,
    });
    await expect(counts(oldEmail)).resolves.toMatchObject({
      users: 1,
      identities: 1,
    });
    await expect(counts(newEmail)).resolves.toMatchObject({ users: 0 });
  });

  it('requires a token', async () => {
    const empty = await request(ctx.app.getHttpServer()).post('/auth/apple');
    expect(empty.status).toBe(422);
    expect(empty.body.errors).toEqual(['idToken.token.required']);

    for (const body of [{}, { idToken: '' }, { idToken: 42 }]) {
      const response = await signIn(body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['idToken.token.required']);
    }
    expect(ctx.apple.calls).toHaveLength(0);
  });

  it('refuses an invalid token', async () => {
    const response = await signIn({ idToken: 'forged', name: 'Maria Silva' });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.apple.tokenInvalid']);
    expect(ctx.apple.calls).toEqual(['forged']);
  });

  it('refuses an unverified email', async () => {
    const email = uniqueEmail('ana');
    const user = await ctx.prisma.user.create({
      data: { id: randomUUID(), name: 'Ana Rocha', email, status: 'approved' },
    });
    const sub = `sub-${randomUUID()}`;
    await ctx.prisma.identity.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        provider: 'apple',
        providerUserId: sub,
        email,
      },
    });

    for (const payload of [{ email }, { email, sub }]) {
      const response = await signIn({
        idToken: token({ ...payload, emailVerified: false }),
      });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.apple.emailNotVerified']);
    }
    await expect(counts(email)).resolves.toEqual({
      users: 1,
      identities: 1,
      refreshTokens: 0,
    });
  });

  it('refuses a token without an email', async () => {
    const sub = `sub-${randomUUID()}`;

    const response = await signIn({
      idToken: token({ sub, emailVerified: false }),
      name: 'Maria Silva',
    });

    expect(response.status).toBe(401);
    expect(response.body.errors).toEqual(['auth.apple.emailMissing']);
    await expect(
      ctx.prisma.identity.count({
        where: { provider: 'apple', providerUserId: sub },
      }),
    ).resolves.toBe(0);
  });

  it('asks for a name', async () => {
    const email = uniqueEmail('maria');
    const idToken = token({ email });

    for (const body of [
      { idToken },
      { idToken, name: 'Maria' },
      { idToken, name: 'x'.repeat(81) },
    ]) {
      const missing = await signIn(body);

      expect(missing.status).toBe(422);
      expect(missing.body.errors.length).toBeGreaterThan(0);
      expect(
        (missing.body.errors as string[]).every((key) =>
          key.startsWith('user.name.'),
        ),
      ).toBe(true);
      await expect(counts(email)).resolves.toEqual({
        users: 0,
        identities: 0,
        refreshTokens: 0,
      });
    }

    const response = await signIn({ idToken, name: 'Maria Souza' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      name: 'Maria Souza',
      status: 'pending',
    });
    await expect(counts(email)).resolves.toEqual({
      users: 1,
      identities: 1,
      refreshTokens: 1,
    });
  });

  it('accepts a relay address', async () => {
    const realEmail = uniqueEmail('ana');
    const ana = await ctx.prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: realEmail,
        status: 'approved',
      },
    });
    const relay = `${randomUUID().slice(0, 8)}@privaterelay.appleid.com`;
    relayEmails.push(relay);
    const sub = `sub-${randomUUID()}`;

    const first = await signIn({
      idToken: token({ email: relay, sub }),
      name: 'Maria Silva',
    });
    const second = await signIn({ idToken: token({ email: relay, sub }) });

    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({
      email: relay,
      role: 'student',
      status: 'pending',
    });
    expect(first.body.user.id).not.toBe(ana.id);
    expect(second.body.user.id).toBe(first.body.user.id);
    await expect(counts(relay)).resolves.toMatchObject({
      users: 1,
      identities: 1,
    });
    await expect(counts(realEmail)).resolves.toMatchObject({
      users: 1,
      identities: 0,
    });
  });
});
