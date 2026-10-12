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

const DOMAIN = 'registrations.e2e.example.com';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];
const NOT_PENDING: Status[] = ['approved', 'denied', 'deleted', 'removed'];
const UNKNOWN_ID = '6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10';

interface Account {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

describe('Registrations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${DOMAIN}` } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  /** Creates an account in `status` with its token (the guard reads the status on every request). */
  async function account(
    role: Role = 'admin',
    status: Status = 'approved',
    createdAt?: Date,
  ): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Ana ${role}`,
        email: `${role}.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status,
        role,
        ...(createdAt ? { createdAt } : {}),
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      accessToken: tokens.signAccessToken(user).token,
    };
  }

  const list = (token?: string) => as(token, http().get('/registrations'));
  const approve = (token: string | undefined, id: string) =>
    as(token, http().post(`/registrations/${id}/approve`));
  const deny = (token: string | undefined, id: string, body?: object) => {
    const req = as(token, http().post(`/registrations/${id}/deny`));
    return body === undefined ? req : req.send(body);
  };

  const row = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });

  /** The list holds every pending user of the database; the suite looks only at its own. */
  async function ownItems(token: string) {
    const response = await list(token);
    expect(response.status).toBe(200);
    return (response.body.items as { id: string; email: string }[]).filter(
      (item) => item.email.endsWith(`@${DOMAIN}`),
    );
  }

  describe('GET /registrations', () => {
    it('lists pending registrations oldest first', async () => {
      const admin = await account('admin');
      const b = await account(
        'instructor',
        'pending',
        new Date('2026-10-02T10:00:00.000Z'),
      );
      const a = await account(
        'student',
        'pending',
        new Date('2026-10-01T10:00:00.000Z'),
      );
      await account('student', 'approved');
      await account('student', 'denied');
      await account('student', 'deleted');
      await account('student', 'removed');

      const items = await ownItems(admin.accessToken);

      expect(items).toEqual([
        {
          id: a.id,
          name: a.name,
          email: a.email,
          createdAt: '2026-10-01T10:00:00.000Z',
        },
        {
          id: b.id,
          name: b.name,
          email: b.email,
          createdAt: '2026-10-02T10:00:00.000Z',
        },
      ]);
    });

    it('answers an empty list', async () => {
      const admin = await account('admin');

      await expect(ownItems(admin.accessToken)).resolves.toEqual([]);
    });
  });

  describe('access', () => {
    it('refuses non-admins', async () => {
      const pending = await account('student', 'pending');
      for (const role of ['student', 'instructor'] as Role[]) {
        const { accessToken } = await account(role);

        for (const response of [
          await list(accessToken),
          await approve(accessToken, pending.id),
          await deny(accessToken, UNKNOWN_ID),
        ]) {
          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['user.role.notAdmin']);
        }
      }
      expect((await row(pending.id)).status).toBe('pending');
    });

    it("refuses admins that aren't approved", async () => {
      const pending = await account('student', 'pending');
      for (const status of NOT_APPROVED) {
        const { accessToken } = await account('admin', status);

        for (const response of [
          await list(accessToken),
          await approve(accessToken, pending.id),
          await deny(accessToken, pending.id),
        ]) {
          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['user.status.notApproved']);
        }
      }
      expect((await row(pending.id)).status).toBe('pending');
    });

    it('refuses requests without a token', async () => {
      for (const response of [
        await list(),
        await approve(undefined, UNKNOWN_ID),
        await deny(undefined, UNKNOWN_ID),
      ]) {
        expect(response.status).toBe(401);
        expect(response.body.errors).toEqual(['auth.token.invalid']);
      }
    });
  });

  describe('POST /registrations/:id/approve', () => {
    it('approves a pending registration', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');

      const response = await approve(admin.accessToken, pending.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: pending.id, status: 'approved' });
      const stored = await row(pending.id);
      expect(stored.status).toBe('approved');
      expect(stored.role).toBe('student');
      expect(stored.denialReason).toBeNull();
      expect(stored.deniedAt).toBeNull();

      const me = await as(pending.accessToken, http().get('/auth/me'));
      expect(me.body.status).toBe('approved');
    });

    it('ignores a request body', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');

      const response = await as(
        admin.accessToken,
        http().post(`/registrations/${pending.id}/approve`),
      ).send({ reason: 'x', status: 'denied' });

      expect(response.status).toBe(200);
      expect((await row(pending.id)).status).toBe('approved');
    });
  });

  describe('POST /registrations/:id/deny', () => {
    it('denies with a trimmed reason', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');
      const before = Date.now();

      const response = await deny(admin.accessToken, pending.id, {
        reason: '  Não conhecemos você.  ',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: pending.id, status: 'denied' });
      const stored = await row(pending.id);
      expect(stored.status).toBe('denied');
      expect(stored.denialReason).toBe('Não conhecemos você.');
      expect(stored.deniedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(stored.deniedAt!.getTime()).toBeLessThanOrEqual(Date.now() + 1000);

      const me = await as(pending.accessToken, http().get('/auth/me'));
      expect(me.body.denialReason).toBe('Não conhecemos você.');
    });

    it.each([
      ['no body', undefined],
      ['no reason', {}],
      ['null', { reason: null }],
      ['an empty reason', { reason: '' }],
      ['a blank reason', { reason: '   ' }],
    ])('denies without a reason (%s)', async (_label, body) => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');

      const response = await deny(admin.accessToken, pending.id, body);

      expect(response.status).toBe(200);
      const stored = await row(pending.id);
      expect(stored.status).toBe('denied');
      expect(stored.denialReason).toBeNull();
    });

    it('accepts a reason of 500 characters', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');

      const response = await deny(admin.accessToken, pending.id, {
        reason: 'a'.repeat(500),
      });

      expect(response.status).toBe(200);
      expect((await row(pending.id)).denialReason).toHaveLength(500);
    });

    it('refuses an invalid reason', async () => {
      const admin = await account('admin');
      const pending = await account('student', 'pending');

      const tooLong = await deny(admin.accessToken, pending.id, {
        reason: ` ${'a'.repeat(501)} `,
      });
      const notString = await deny(admin.accessToken, pending.id, {
        reason: 42,
      });

      expect(tooLong.status).toBe(422);
      expect(tooLong.body.errors).toEqual(['user.denialReason.max.length']);
      expect(notString.status).toBe(422);
      expect(notString.body.errors).toEqual(['registration.reason.invalid']);
      expect((await row(pending.id)).status).toBe('pending');
    });
  });

  describe('a decision is final', () => {
    it.each(NOT_PENDING)(
      'refuses a second decision on a %s user',
      async (status) => {
        const admin = await account('admin');
        const decided = await account('student', status);
        const before = await row(decided.id);

        for (const response of [
          await approve(admin.accessToken, decided.id),
          await deny(admin.accessToken, decided.id, { reason: 'x' }),
        ]) {
          expect(response.status).toBe(409);
          expect(response.body.errors).toEqual([
            'registration.status.notPending',
          ]);
        }
        expect(await row(decided.id)).toEqual(before);
      },
    );

    it.each([
      ['approve + deny', 'approve', 'deny'],
      ['deny + deny', 'deny', 'deny'],
    ])('decides once under concurrency (%s)', async (_label, first, second) => {
      const admin = await account('admin');
      const other = await account('admin');
      const pending = await account('student', 'pending');
      // Each admin's denial carries its own reason, so the row shows which request won.
      const send = (kind: string, token: string, reason: string) =>
        kind === 'approve'
          ? approve(token, pending.id)
          : deny(token, pending.id, { reason });

      const responses = await Promise.all([
        send(first, admin.accessToken, 'by first'),
        send(second, other.accessToken, 'by second'),
      ]);

      const statuses = responses
        .map((response) => response.status)
        .sort((x, y) => x - y);
      expect(statuses).toEqual([200, 409]);
      const winner = responses.find((response) => response.status === 200)!;
      const stored = await row(pending.id);
      expect(stored.status).toBe(winner.body.status);
      if (stored.status === 'approved') {
        expect(stored.denialReason).toBeNull();
        expect(stored.deniedAt).toBeNull();
      } else {
        const winnerIsFirst = winner === responses[0];
        expect(stored.denialReason).toBe(
          winnerIsFirst ? 'by first' : 'by second',
        );
      }
    });

    it('answers 404 for unknown and malformed ids', async () => {
      const admin = await account('admin');

      for (const id of [UNKNOWN_ID, 'abc']) {
        for (const response of [
          await approve(admin.accessToken, id),
          await deny(admin.accessToken, id),
        ]) {
          expect(response.status).toBe(404);
          expect(response.body.errors).toEqual(['registration.notFound']);
        }
      }
    });
  });
});
