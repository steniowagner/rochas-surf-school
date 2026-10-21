import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'school-settings.e2e.example.com';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const ROLES: Role[] = ['student', 'instructor', 'admin'];
const STATUSES: Status[] = [
  'pending',
  'approved',
  'denied',
  'deleted',
  'removed',
];
const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

interface Account {
  id: string;
  email: string;
  accessToken: string;
}

describe('School settings (e2e)', () => {
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

  beforeEach(async () => {
    await prisma.schoolSettings.deleteMany();
  });

  afterEach(async () => {
    await prisma.schoolSettings.deleteMany();
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
  ): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: `${role}.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status,
        role,
      },
    });
    return {
      id: user.id,
      email: user.email,
      accessToken: tokens.signAccessToken(user).token,
    };
  }

  const read = (token?: string) => as(token, http().get('/school-settings'));
  const setWhatsapp = (token: string | undefined, body?: object | string) => {
    const req = as(token, http().put('/school-settings/whatsapp'));
    return body === undefined ? req : req.send(body);
  };

  const setWaitingList = (
    token: string | undefined,
    body?: object | string,
  ) => {
    const req = as(token, http().put('/school-settings/waiting-list'));
    return body === undefined ? req : req.send(body);
  };

  async function storedNumbers(): Promise<(string | null)[]> {
    const rows = await prisma.schoolSettings.findMany();
    return rows.map((row) => row.whatsappNumber);
  }

  async function storeNumber(whatsappNumber: string): Promise<void> {
    const { accessToken } = await account('admin');
    const response = await setWhatsapp(accessToken, { whatsappNumber });
    expect(response.status).toBe(200);
  }

  describe('GET /school-settings', () => {
    it('reads nothing set', async () => {
      const { accessToken } = await account('student');

      const response = await read(accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        whatsappNumber: null,
        waitingListEnabled: true,
      });
    });

    it('reads the number for every status', async () => {
      await storeNumber('+5585999998888');

      for (const role of ROLES) {
        for (const status of STATUSES) {
          const { accessToken } = await account(role, status);

          const response = await read(accessToken);

          expect({
            role,
            status,
            code: response.status,
            body: response.body,
          }).toEqual({
            role,
            status,
            code: 200,
            body: {
              whatsappNumber: '+5585999998888',
              waitingListEnabled: true,
            },
          });
        }
      }
    });
  });

  describe('PUT /school-settings/whatsapp', () => {
    it('sets the number', async () => {
      const { accessToken } = await account('admin');

      const response = await setWhatsapp(accessToken, {
        whatsappNumber: '+5585999998888',
        ignored: 'extra field',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        whatsappNumber: '+5585999998888',
        waitingListEnabled: true,
      });
      expect(await storedNumbers()).toEqual(['+5585999998888']);
      const { accessToken: studentToken } = await account('student', 'denied');
      expect((await read(studentToken)).body).toEqual({
        whatsappNumber: '+5585999998888',
        waitingListEnabled: true,
      });
    });

    it('replaces the number', async () => {
      const { accessToken } = await account('admin');
      await setWhatsapp(accessToken, { whatsappNumber: '+5585999998888' });

      const response = await setWhatsapp(accessToken, {
        whatsappNumber: '+351912345678',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        whatsappNumber: '+351912345678',
        waitingListEnabled: true,
      });
      expect(await storedNumbers()).toEqual(['+351912345678']);
      expect((await read(accessToken)).body).toEqual({
        whatsappNumber: '+351912345678',
        waitingListEnabled: true,
      });
    });

    it('answers the same number when it is set again', async () => {
      const { accessToken } = await account('admin');
      await setWhatsapp(accessToken, { whatsappNumber: '+5585999998888' });

      const response = await setWhatsapp(accessToken, {
        whatsappNumber: '+5585999998888',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        whatsappNumber: '+5585999998888',
        waitingListEnabled: true,
      });
      expect(await storedNumbers()).toEqual(['+5585999998888']);
    });

    describe('invalid input', () => {
      it.each<[string, object | undefined, string]>([
        ['a missing body', undefined, 'schoolSettings.whatsappNumber.required'],
        ['a missing number', {}, 'schoolSettings.whatsappNumber.required'],
        [
          'a null number',
          { whatsappNumber: null },
          'schoolSettings.whatsappNumber.required',
        ],
        [
          'an empty number',
          { whatsappNumber: '' },
          'schoolSettings.whatsappNumber.required',
        ],
        [
          'a formatted number',
          { whatsappNumber: '+55 (85) 99999-8888' },
          'schoolSettings.whatsappNumber.phone',
        ],
        [
          'an extension',
          { whatsappNumber: '+5585999998888 ext. 12' },
          'schoolSettings.whatsappNumber.phone',
        ],
        [
          'a trailing space',
          { whatsappNumber: '+5585999998888 ' },
          'schoolSettings.whatsappNumber.phone',
        ],
        [
          'an impossible number',
          { whatsappNumber: '+55123' },
          'schoolSettings.whatsappNumber.phone',
        ],
        [
          'a JSON number',
          { whatsappNumber: 5585999998888 },
          'schoolSettings.whatsappNumber.phone',
        ],
      ])(
        'refuses %s with 422 and keeps the stored number',
        async (_label, body, key) => {
          await storeNumber('+351912345678');
          const { accessToken } = await account('admin');

          const response = await setWhatsapp(accessToken, body);

          expect(response.status).toBe(422);
          expect(response.body.errors).toContain(key);
          expect(await storedNumbers()).toEqual(['+351912345678']);
        },
      );

      it('stores nothing when no number was set before', async () => {
        const { accessToken } = await account('admin');

        const response = await setWhatsapp(accessToken, {
          whatsappNumber: '+55123',
        });

        expect(response.status).toBe(422);
        expect(await storedNumbers()).toEqual([]);
      });
    });

    describe('not approved', () => {
      it.each(NOT_APPROVED)(
        'refuses a %s admin with 403 and stores nothing',
        async (status) => {
          const { accessToken } = await account('admin', status);

          const response = await setWhatsapp(accessToken, {
            whatsappNumber: '+5585999998888',
          });

          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['user.status.notApproved']);
          expect(await storedNumbers()).toEqual([]);
        },
      );

      it('checks the status before the number', async () => {
        const { accessToken } = await account('student', 'pending');

        const response = await setWhatsapp(accessToken, {
          whatsappNumber: '+55123',
        });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      });
    });

    describe('not admin', () => {
      it.each<Role>(['student', 'instructor'])(
        'refuses an approved %s with 403 and keeps the stored number',
        async (role) => {
          await storeNumber('+351912345678');
          const { accessToken } = await account(role);

          const response = await setWhatsapp(accessToken, {
            whatsappNumber: '+5585999998888',
          });

          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual([
            'schoolSettings.role.notAdmin',
          ]);
          expect(await storedNumbers()).toEqual(['+351912345678']);
        },
      );
    });
  });

  describe('PUT /school-settings/waiting-list', () => {
    it('turns the waiting list off and on, readable by any signed-in account', async () => {
      const { accessToken } = await account('admin');
      const { accessToken: studentToken } = await account('student');

      const off = await setWaitingList(accessToken, { enabled: false });

      expect(off.status).toBe(200);
      expect(off.body).toEqual({
        whatsappNumber: null,
        waitingListEnabled: false,
      });
      expect((await read(studentToken)).body).toEqual(off.body);

      const on = await setWaitingList(accessToken, { enabled: true });

      expect(on.status).toBe(200);
      expect(on.body.waitingListEnabled).toBe(true);
      expect((await read(studentToken)).body.waitingListEnabled).toBe(true);
    });

    it('keeps the number when the switch is saved and the switch when the number is saved', async () => {
      await storeNumber('+5585999998888');
      const { accessToken } = await account('admin');

      await setWaitingList(accessToken, { enabled: false });
      expect((await read(accessToken)).body).toEqual({
        whatsappNumber: '+5585999998888',
        waitingListEnabled: false,
      });

      await setWhatsapp(accessToken, { whatsappNumber: '+351912345678' });
      expect((await read(accessToken)).body).toEqual({
        whatsappNumber: '+351912345678',
        waitingListEnabled: false,
      });
    });

    it.each<[string, object | undefined]>([
      ['a missing body', undefined],
      ['a missing switch', {}],
      ['a null switch', { enabled: null }],
      ['a string switch', { enabled: 'false' }],
      ['a number switch', { enabled: 0 }],
    ])(
      'refuses %s with 422 and keeps the stored switch',
      async (_label, body) => {
        const { accessToken } = await account('admin');
        await setWaitingList(accessToken, { enabled: false });

        const response = await setWaitingList(accessToken, body);

        expect(response.status).toBe(422);
        expect(response.body.errors).toContain(
          'schoolSettings.waitingList.invalid',
        );
        expect((await read(accessToken)).body.waitingListEnabled).toBe(false);
      },
    );

    it.each(NOT_APPROVED)('refuses a %s admin with 403', async (status) => {
      const { accessToken } = await account('admin', status);

      const response = await setWaitingList(accessToken, { enabled: false });

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
      expect(await prisma.schoolSettings.count()).toBe(0);
    });

    it.each<Role>(['student', 'instructor'])(
      'refuses an approved %s with 403',
      async (role) => {
        const { accessToken } = await account(role);

        const response = await setWaitingList(accessToken, { enabled: false });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['schoolSettings.role.notAdmin']);
        expect(await prisma.schoolSettings.count()).toBe(0);
      },
    );

    it('refuses a request without a token', async () => {
      const response = await setWaitingList(undefined, { enabled: false });

      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    });
  });

  describe('without a valid token', () => {
    const expectInvalid = (response: request.Response) => {
      expect(response.status).toBe(401);
      expect(response.body.errors).toEqual(['auth.token.invalid']);
    };

    it.each([
      ['GET', (token?: string) => read(token)],
      [
        'PUT',
        (token?: string) =>
          setWhatsapp(token, { whatsappNumber: '+5585999998888' }),
      ],
    ] as const)(
      '%s refuses a request without Authorization',
      async (_method, send) => {
        expectInvalid(await send(undefined));
      },
    );

    it.each([
      ['GET', (token?: string) => read(token)],
      [
        'PUT',
        (token?: string) =>
          setWhatsapp(token, { whatsappNumber: '+5585999998888' }),
      ],
    ] as const)('%s refuses a malformed token', async (_method, send) => {
      expectInvalid(await send('not-a-jwt'));
    });

    it.each([
      ['GET', (token?: string) => read(token)],
      [
        'PUT',
        (token?: string) =>
          setWhatsapp(token, { whatsappNumber: '+5585999998888' }),
      ],
    ] as const)('%s refuses an expired token', async (_method, send) => {
      const { id, email } = await account('admin');
      const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
        sub: id,
        email,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      expectInvalid(await send(token));
      expect(await storedNumbers()).toEqual([]);
    });

    it.each([
      ['GET', (token?: string) => read(token)],
      [
        'PUT',
        (token?: string) =>
          setWhatsapp(token, { whatsappNumber: '+5585999998888' }),
      ],
    ] as const)(
      '%s refuses a token whose account no longer exists',
      async (_method, send) => {
        const { id, accessToken } = await account('admin');
        await prisma.user.delete({ where: { id } });

        expectInvalid(await send(accessToken));
        expect(await storedNumbers()).toEqual([]);
      },
    );
  });
});
