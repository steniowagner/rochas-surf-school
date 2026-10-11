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

const DOMAIN = 'school-rules.e2e.example.com';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

interface Account {
  id: string;
  accessToken: string;
}

interface RuleBody {
  id: string;
  title: string;
  description: string;
  index: number;
}

describe('School rules (e2e)', () => {
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
    await prisma.schoolRule.deleteMany();
    await prisma.rulesVersion.updateMany({ data: { version: 0 } });
  });

  afterEach(async () => {
    await prisma.schoolRule.deleteMany();
    await prisma.rulesVersion.updateMany({ data: { version: 0 } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  /** Creates an approved account and its token, then moves it to `status` (the guard reads it on every request). */
  async function account(role: Role = 'admin', status: Status = 'approved'): Promise<Account> {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Ana Rocha',
        email: `${role}.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status: 'approved',
        role,
      },
    });
    if (status !== 'approved') {
      await prisma.user.update({ where: { id: user.id }, data: { status } });
    }
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  async function seed(titles: string[], version = 0): Promise<RuleBody[]> {
    const rules = titles.map((title, position) => ({
      id: randomUUID(),
      title,
      description: `${title} description`,
      index: position + 1,
    }));
    for (const rule of rules) {
      await prisma.schoolRule.create({ data: rule });
    }
    await prisma.rulesVersion.updateMany({ data: { version } });
    return rules;
  }

  const list = (token?: string) => as(token, http().get('/school-rules'));
  const create = (token: string | undefined, body?: object) => {
    const req = as(token, http().post('/school-rules'));
    return body === undefined ? req : req.send(body);
  };
  const update = (token: string | undefined, id: string, body?: object) => {
    const req = as(token, http().put(`/school-rules/${id}`));
    return body === undefined ? req : req.send(body);
  };
  const remove = (token: string | undefined, id: string) =>
    as(token, http().delete(`/school-rules/${id}`));
  const reorder = (token: string | undefined, body?: object) => {
    const req = as(token, http().put('/school-rules/order'));
    return body === undefined ? req : req.send(body);
  };

  async function stored() {
    const rows = await prisma.schoolRule.findMany({ orderBy: [{ index: 'asc' }, { createdAt: 'asc' }] });
    const { version } = await prisma.rulesVersion.findFirstOrThrow();
    return { version, rows: rows.map((row) => [row.title, row.index]) };
  }

  it('starts from a reset database at version 0 with the single version row', async () => {
    expect(await prisma.rulesVersion.count()).toBe(1);
    expect((await stored()).version).toBe(0);
  });

  describe('GET /school-rules', () => {
    it('answers version 0 and no rules when nothing was ever changed', async () => {
      const { accessToken } = await account('student');

      const response = await list(accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ version: 0, rules: [] });
    });

    it.each<Role>(['student', 'instructor', 'admin'])(
      'lists the rules in order, with no other field, to an approved %s',
      async (role) => {
        const [first, second] = await seed(['first', 'second'], 7);
        await prisma.schoolRule.update({ where: { id: first.id }, data: { index: 2 } });
        await prisma.schoolRule.update({ where: { id: second.id }, data: { index: 1 } });
        const { accessToken } = await account(role);

        const response = await list(accessToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          version: 7,
          rules: [
            { id: second.id, title: 'second', description: 'second description', index: 1 },
            { id: first.id, title: 'first', description: 'first description', index: 2 },
          ],
        });
      },
    );

    it.each<Status>(['pending', 'denied', 'deleted', 'removed'])(
      'refuses a %s account with user.status.notApproved',
      async (status) => {
        const { accessToken } = await account('admin', status);

        const response = await list(accessToken);

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      },
    );

    it('answers 401 without a token or with a bad one', async () => {
      for (const token of [undefined, 'not-a-token']) {
        const response = await list(token);

        expect(response.status).toBe(401);
        expect(response.body.errors).toEqual(['auth.token.invalid']);
      }
    });
  });

  describe('POST /school-rules', () => {
    it('adds the first rule at index 1 and moves the version to 1', async () => {
      const admin = await account();

      const response = await create(admin.accessToken, {
        title: 'Chega 15 min antes',
        description: 'Tempo para vestir o fato.',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        version: 1,
        rules: [
          {
            id: expect.any(String),
            title: 'Chega 15 min antes',
            description: 'Tempo para vestir o fato.',
            index: 1,
          },
        ],
      });
    });

    it('appends the trimmed rule last, raises the version by 1 and stores the creator', async () => {
      const admin = await account();
      await seed(['a', 'b'], 4);

      const response = await create(admin.accessToken, {
        title: '  Chega 15 min antes ',
        description: 'Tempo para vestir o fato.',
      });

      expect(response.status).toBe(201);
      expect(response.body.version).toBe(5);
      expect(response.body.rules.map((item: RuleBody) => [item.title, item.index])).toEqual([
        ['a', 1],
        ['b', 2],
        ['Chega 15 min antes', 3],
      ]);
      const row = await prisma.schoolRule.findUniqueOrThrow({ where: { id: response.body.rules[2].id } });
      expect(row.createdBy).toBe(admin.id);
    });

    it('lets a following GET return the new rule', async () => {
      const admin = await account();
      await create(admin.accessToken, { title: 't', description: 'd' }).expect(201);

      const response = await list(admin.accessToken);

      expect(response.body).toMatchObject({ version: 1, rules: [{ title: 't', index: 1 }] });
    });
  });

  describe('invalid title or description', () => {
    const cases: [string, object, string[]][] = [
      ['an empty title', { title: '', description: 'ok' }, ['schoolRule.title.required']],
      ['a whitespace-only title', { title: '   ', description: 'ok' }, ['schoolRule.title.required']],
      ['a title of 61 characters', { title: 'a'.repeat(61), description: 'ok' }, ['schoolRule.title.max.length']],
      ['an empty description', { title: 'ok', description: '' }, ['schoolRule.description.required']],
      [
        'a description of 301 characters',
        { title: 'ok', description: 'b'.repeat(301) },
        ['schoolRule.description.max.length'],
      ],
      ['both fields missing', {}, ['schoolRule.title.required', 'schoolRule.description.required']],
    ];

    it.each(cases)('refuses to create with %s (invalid)', async (_name, body, keys) => {
      const admin = await account();
      await seed(['a'], 2);

      const response = await create(admin.accessToken, body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(keys);
      expect(await stored()).toEqual({ version: 2, rows: [['a', 1]] });
    });

    it.each(cases)('refuses to edit with %s (invalid)', async (_name, body, keys) => {
      const admin = await account();
      const [rule] = await seed(['a'], 2);

      const response = await update(admin.accessToken, rule.id, body);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(keys);
      expect(await stored()).toEqual({ version: 2, rows: [['a', 1]] });
    });

    it('accepts exactly 60 and 300 characters', async () => {
      const admin = await account();

      const response = await create(admin.accessToken, {
        title: 'a'.repeat(60),
        description: 'b'.repeat(300),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('not an admin', () => {
    it.each<Role>(['student', 'instructor'])(
      'refuses an approved %s on every change route (not an admin)',
      async (role) => {
        const [rule] = await seed(['a', 'b'], 3);
        const { accessToken } = await account(role);
        const responses = [
          await create(accessToken, { title: 't', description: 'd' }),
          await update(accessToken, rule.id, { title: 't', description: 'd' }),
          await remove(accessToken, rule.id),
          await reorder(accessToken, { ruleIds: [rule.id] }),
        ];

        for (const response of responses) {
          expect(response.status).toBe(403);
          expect(response.body.errors).toEqual(['schoolRule.role.notAdmin']);
        }
        expect(await stored()).toEqual({ version: 3, rows: [['a', 1], ['b', 2]] });
      },
    );

    it('refuses an admin that is not approved with user.status.notApproved (not an admin)', async () => {
      const [rule] = await seed(['a'], 1);
      const { accessToken } = await account('admin', 'pending');

      const response = await update(accessToken, rule.id, { title: 't', description: 'd' });

      expect(response.status).toBe(403);
      expect(response.body.errors).toEqual(['user.status.notApproved']);
    });

    it('answers 401 on every change route without a token', async () => {
      const [rule] = await seed(['a'], 1);
      const responses = [
        await create(undefined, { title: 't', description: 'd' }),
        await update(undefined, rule.id, { title: 't', description: 'd' }),
        await remove(undefined, rule.id),
        await reorder(undefined, { ruleIds: [rule.id] }),
      ];

      for (const response of responses) {
        expect(response.status).toBe(401);
        expect(response.body.errors).toEqual(['auth.token.invalid']);
      }
    });
  });

  describe('PUT /school-rules/:id', () => {
    it('edits the text, keeps the index and raises the version', async () => {
      const admin = await account();
      const [a, b, c] = await seed(['a', 'b', 'c'], 5);

      const response = await update(admin.accessToken, b.id, {
        title: ' novo título ',
        description: 'nova explicação',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        version: 6,
        rules: [
          { id: a.id, title: 'a', description: 'a description', index: 1 },
          { id: b.id, title: 'novo título', description: 'nova explicação', index: 2 },
          { id: c.id, title: 'c', description: 'c description', index: 3 },
        ],
      });
    });

    it('answers 200 and keeps the version when nothing changed', async () => {
      const admin = await account();
      const [a] = await seed(['a', 'b'], 5);

      const response = await update(admin.accessToken, a.id, {
        title: ' a ',
        description: 'a description',
      });

      expect(response.status).toBe(200);
      expect(response.body.version).toBe(5);
      expect(response.body.rules).toHaveLength(2);
    });

    it.each(['00000000-0000-4000-8000-000000000000', 'not-a-uuid'])(
      'answers 404 schoolRule.id.notFound for the id %s',
      async (id) => {
        const admin = await account();
        await seed(['a'], 2);

        const response = await update(admin.accessToken, id, { title: 't', description: 'd' });

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['schoolRule.id.notFound']);
        expect(await stored()).toEqual({ version: 2, rows: [['a', 1]] });
      },
    );
  });

  describe('DELETE /school-rules/:id', () => {
    it('deletes a rule, moves the next ones up and raises the version', async () => {
      const admin = await account();
      const [a, b, c, d] = await seed(['a', 'b', 'c', 'd'], 2);

      const response = await remove(admin.accessToken, b.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        version: 3,
        rules: [
          { id: a.id, title: 'a', description: 'a description', index: 1 },
          { id: c.id, title: 'c', description: 'c description', index: 2 },
          { id: d.id, title: 'd', description: 'd description', index: 3 },
        ],
      });
      expect(await prisma.schoolRule.findUnique({ where: { id: b.id } })).toBeNull();
    });

    it('leaves the other indexes alone when the last rule is deleted', async () => {
      const admin = await account();
      const rules = await seed(['a', 'b', 'c']);

      const response = await remove(admin.accessToken, rules[2].id);

      expect(response.body.version).toBe(1);
      expect(await stored()).toEqual({ version: 1, rows: [['a', 1], ['b', 2]] });
    });

    it('leaves no rules when the only rule is deleted', async () => {
      const admin = await account();
      const [only] = await seed(['a'], 8);

      const response = await remove(admin.accessToken, only.id);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ version: 9, rules: [] });
    });

    it.each(['00000000-0000-4000-8000-000000000000', 'not-a-uuid'])(
      'answers 404 schoolRule.id.notFound for the id %s',
      async (id) => {
        const admin = await account();
        await seed(['a'], 2);

        const response = await remove(admin.accessToken, id);

        expect(response.status).toBe(404);
        expect(response.body.errors).toEqual(['schoolRule.id.notFound']);
        expect(await stored()).toEqual({ version: 2, rows: [['a', 1]] });
      },
    );
  });

  describe('PUT /school-rules/order', () => {
    it('applies the new order without changing the version', async () => {
      const admin = await account();
      const [a, b, c] = await seed(['a', 'b', 'c'], 6);

      const response = await reorder(admin.accessToken, { ruleIds: [c.id, a.id, b.id] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        version: 6,
        rules: [
          { id: c.id, title: 'c', description: 'c description', index: 1 },
          { id: a.id, title: 'a', description: 'a description', index: 2 },
          { id: b.id, title: 'b', description: 'b description', index: 3 },
        ],
      });
      expect((await list(admin.accessToken)).body).toEqual(response.body);
    });

    it('answers 200 with nothing changed when the order is the current one', async () => {
      const admin = await account();
      const [a, b, c] = await seed(['a', 'b', 'c'], 6);

      const response = await reorder(admin.accessToken, { ruleIds: [a.id, b.id, c.id] });

      expect(response.status).toBe(200);
      expect(response.body.version).toBe(6);
      expect(await stored()).toEqual({ version: 6, rows: [['a', 1], ['b', 2], ['c', 3]] });
    });

    it('answers 200 with no rules for an empty list', async () => {
      const admin = await account();

      const response = await reorder(admin.accessToken, { ruleIds: [] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ version: 0, rules: [] });
    });

    it('does not read "order" as a rule id', async () => {
      const admin = await account();
      await seed(['a'], 1);

      const response = await reorder(admin.accessToken, { ruleIds: [] });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['schoolRule.order.mismatch']);
    });
  });

  describe('order mismatch', () => {
    it.each([
      ['misses a rule', (ids: string[]) => ids.slice(0, 2)],
      ['repeats a rule', (ids: string[]) => [ids[0], ids[0], ids[1], ids[2]]],
      ['names an unknown id', (ids: string[]) => [...ids, randomUUID()]],
    ])('refuses a list that %s with schoolRule.order.mismatch (order mismatch)', async (_name, build) => {
      const admin = await account();
      const rules = await seed(['a', 'b', 'c'], 4);

      const response = await reorder(admin.accessToken, { ruleIds: build(rules.map((r) => r.id)) });

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual(['schoolRule.order.mismatch']);
      expect(await stored()).toEqual({ version: 4, rows: [['a', 1], ['b', 2], ['c', 3]] });
    });

    it.each([undefined, { ruleIds: 'a,b' }, { ruleIds: [1, 2] }, {}])(
      'refuses the body %j with schoolRule.order.required (order mismatch)',
      async (body) => {
        const admin = await account();
        await seed(['a'], 4);

        const response = await reorder(admin.accessToken, body);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(['schoolRule.order.required']);
        expect(await stored()).toEqual({ version: 4, rows: [['a', 1]] });
      },
    );
  });
});
