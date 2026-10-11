import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'rules-acceptance.e2e.example.com';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

interface Account {
  id: string;
  email: string;
  createdAt: Date;
  accessToken: string;
}

describe('Accepting the school rules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;

  const resetRules = async () => {
    await prisma.schoolRule.deleteMany();
    await prisma.rulesVersion.updateMany({ data: { version: 0 } });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
  });

  beforeEach(resetRules);

  afterEach(async () => {
    await resetRules();
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  });

  afterAll(async () => {
    await app.close();
  });

  const setVersion = (version: number) => prisma.rulesVersion.updateMany({ data: { version } });
  const accept = (token: string | undefined, body?: object) => {
    const req = request(app.getHttpServer()).post('/school-rules/acceptances');
    const authorized = token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
    return body === undefined ? authorized : authorized.send(body);
  };
  const rowsOf = (userId: string) =>
    prisma.userRulesAcceptance.findMany({ where: { userId }, orderBy: { version: 'asc' } });

  async function account(
    role: Role = 'student',
    status: Status = 'approved',
    whatsappNumber: string | null = null,
  ): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: `${role}.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status,
        role,
        whatsappNumber,
      },
    });
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      accessToken: tokens.signAccessToken(user).token,
    };
  }

  describe('POST /school-rules/acceptances', () => {
    it('accepts the current version', async () => {
      await setVersion(3);
      const student = await account('student');
      await prisma.userRulesAcceptance.create({
        data: { userId: student.id, version: 2, acceptedAt: new Date('2026-10-01T10:00:00.000Z') },
      });
      const before = Date.now();

      const response = await accept(student.accessToken, { version: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: student.id,
        name: 'Ana Rocha',
        email: student.email,
        role: 'student',
        status: 'approved',
        createdAt: student.createdAt.toISOString(),
        whatsappNumber: null,
        whatsappVisible: false,
        rulesAccepted: true,
        rulesAcceptedBefore: true,
        denialReason: null,
        reactivationStatus: null,
      });
      const rows = await rowsOf(student.id);
      expect(rows.map((row) => row.version)).toEqual([2, 3]);
      expect(Math.abs(rows[1]!.acceptedAt.getTime() - before)).toBeLessThan(60 * 1000);
    });

    it.each<Role>(['instructor', 'admin'])('accepts the current version as an %s', async (role) => {
      await setVersion(3);
      const user = await account(role);

      const response = await accept(user.accessToken, { version: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ role, rulesAccepted: true });
      expect(await rowsOf(user.id)).toHaveLength(1);
    });

    it('accepts the current version without a WhatsApp number, and keeps the one it has', async () => {
      await setVersion(1);
      const without = await account('student');
      const withNumber = await account('student', 'approved', '+5585999998888');

      const first = await accept(without.accessToken, { version: 1 });
      const second = await accept(withNumber.accessToken, { version: 1 });

      expect(first.body).toMatchObject({ whatsappNumber: null, rulesAccepted: true });
      expect(second.body).toMatchObject({ whatsappNumber: '+5585999998888', rulesAccepted: true });
    });

    it('changes nothing when the version was already accepted', async () => {
      await setVersion(3);
      const student = await account('student');
      const acceptedAt = new Date('2026-10-02T08:30:00.000Z');
      await prisma.userRulesAcceptance.create({ data: { userId: student.id, version: 3, acceptedAt } });

      const response = await accept(student.accessToken, { version: 3 });

      expect(response.status).toBe(200);
      expect(response.body.rulesAccepted).toBe(true);
      const rows = await rowsOf(student.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.acceptedAt).toEqual(acceptedAt);
    });

    it('answers 200 to two concurrent requests for a version already accepted by neither, leaving one row', async () => {
      await setVersion(3);
      const student = await account('student');

      const responses = await Promise.all([
        accept(student.accessToken, { version: 3 }),
        accept(student.accessToken, { version: 3 }),
      ]);

      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      expect(await rowsOf(student.id)).toHaveLength(1);
    });

    it.each([3, 5, -1])('refuses version %i as outdated while the current one is 4', async (version) => {
      await setVersion(4);
      const student = await account('student');

      const response = await accept(student.accessToken, { version });

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['schoolRules.version.outdated']);
      expect(response.body.details).toEqual({ currentVersion: 4 });
      expect(await rowsOf(student.id)).toHaveLength(0);
    });

    it.each([
      ['no body', undefined, 'schoolRules.version.required'],
      ['an empty body', {}, 'schoolRules.version.required'],
      ['a null version', { version: null }, 'schoolRules.version.required'],
      ['a string version', { version: '3' }, 'schoolRules.version.integer'],
      ['a decimal version', { version: 2.5 }, 'schoolRules.version.integer'],
    ])('refuses an invalid version: %s', async (_label, body, key) => {
      await setVersion(3);
      const student = await account('student');

      const response = await accept(student.accessToken, body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual([key]);
      expect(await rowsOf(student.id)).toHaveLength(0);
    });

    it.each([0, 3])('has nothing to accept while the version is 0 (sent %i)', async (version) => {
      const student = await account('student');

      const response = await accept(student.accessToken, { version });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['schoolRules.version.nothingToAccept']);
      expect(await rowsOf(student.id)).toHaveLength(0);
    });

    it('answers the shape errors before nothing to accept', async () => {
      const student = await account('student');

      const response = await accept(student.accessToken, { version: '0' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['schoolRules.version.integer']);
    });

    it.each<Status>(['pending', 'denied', 'deleted', 'removed'])(
      'refuses a %s account as not approved, even with an invalid version',
      async (status) => {
        await setVersion(3);
        const user = await account('student', status);

        for (const body of [{ version: 3 }, { version: 'x' }, undefined]) {
          const response = await accept(user.accessToken, body);

          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['user.status.notApproved']);
        }
        expect(await rowsOf(user.id)).toHaveLength(0);
      },
    );

    it.each([
      ['no token', undefined],
      ['a malformed token', 'not-a-jwt'],
    ])('refuses a request without a valid token: %s', async (_label, token) => {
      await setVersion(3);

      const response = await accept(token, { version: 3 });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    });

    it('is reflected by GET /auth/me', async () => {
      await setVersion(3);
      const student = await account('student');
      const me = () =>
        request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${student.accessToken}`);
      expect((await me()).body.rulesAccepted).toBe(false);

      await accept(student.accessToken, { version: 3 }).expect(200);

      expect((await me()).body.rulesAccepted).toBe(true);
    });
  });
});
