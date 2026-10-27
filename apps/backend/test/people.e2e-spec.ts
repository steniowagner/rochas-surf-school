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

const DOMAIN = 'people.e2e.example.com';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

interface Person {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
  whatsappNumber: string | null;
}

interface AccountOptions {
  name?: string;
  role?: Role;
  status?: Status;
  createdAt?: Date;
  whatsappNumber?: string;
  whatsappVisible?: boolean;
}

describe('People directory (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  // The database is shared: every name carries a tag, and the suite searches for it.
  let tag: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
  });

  beforeEach(() => {
    tag = `Tg${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function account(options: AccountOptions = {}) {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `${tag} ${options.name ?? 'Person'}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status: options.status ?? 'approved',
        role: options.role ?? 'student',
        whatsappNumber: options.whatsappNumber ?? null,
        whatsappVisible: options.whatsappVisible ?? false,
        ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      },
    });
    return { user, accessToken: tokens.signAccessToken({ id: user.id, email: user.email! }).token };
  }

  const people = (token: string | undefined, query: Record<string, string> = {}) => {
    const req = http().get('/people').query({ search: tag, ...query });
    return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  };

  const names = (items: Person[]) => items.map((item) => item.name.replace(`${tag} `, ''));

  it('lists only approved users, with exactly the directory fields', async () => {
    const viewer = await account({ name: 'Viewer' });
    const ana = await account({
      name: 'Ana',
      role: 'instructor',
      whatsappNumber: '+5585999998888',
      whatsappVisible: true,
    });
    for (const status of NOT_APPROVED) await account({ name: status, status });

    const response = await people(viewer.accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, perPage: 20, total: 2 });
    expect((response.body.items as Person[]).find((item) => item.id === ana.user.id)).toEqual({
      id: ana.user.id,
      name: ana.user.name,
      role: 'instructor',
      createdAt: ana.user.createdAt.toISOString(),
      whatsappNumber: '+5585999998888',
    });
    expect(names(response.body.items)).toHaveLength(2);
    expect(names(response.body.items)).toEqual(expect.arrayContaining(['Viewer', 'Ana']));
  });

  it('lists the caller alone when nobody else is approved', async () => {
    const viewer = await account({ name: 'Viewer' });

    const response = await people(viewer.accessToken);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].whatsappNumber).toBeNull();
  });

  it('hides unshared numbers from non-admins', async () => {
    const student = await account({ name: 'Viewer', whatsappNumber: '+5585900000000' });
    await account({ name: 'Shared', whatsappNumber: '+5585911112222', whatsappVisible: true });
    await account({ name: 'Hidden', whatsappNumber: '+5585933334444' });

    const response = await people(student.accessToken);
    const byName = Object.fromEntries(
      (response.body.items as Person[]).map((item) => [item.name.replace(`${tag} `, ''), item]),
    );

    expect(byName.Shared.whatsappNumber).toBe('+5585911112222');
    expect(byName.Hidden.whatsappNumber).toBeNull();
    expect(byName.Viewer.whatsappNumber).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain('whatsappVisible');
    expect(JSON.stringify(response.body)).not.toContain('email');
  });

  it('shows every number to admins', async () => {
    const admin = await account({ name: 'Admin', role: 'admin' });
    await account({ name: 'Hidden', whatsappNumber: '+5585933334444' });
    await account({ name: 'None' });

    const response = await people(admin.accessToken);
    const byName = Object.fromEntries(
      (response.body.items as Person[]).map((item) => [item.name.replace(`${tag} `, ''), item]),
    );

    expect(byName.Hidden.whatsappNumber).toBe('+5585933334444');
    expect(byName.None.whatsappNumber).toBeNull();
  });

  it('filters by role and searches the name ignoring case and accents', async () => {
    const viewer = await account({ name: 'Viewer' });
    await account({ name: 'João Pinto' });
    await account({ name: 'Joana Rocha', role: 'instructor' });
    await account({ name: 'Ana Silva' });

    const token = viewer.accessToken;
    const search = (query: string, role?: string) =>
      people(token, { search: `${tag} ${query}`, ...(role ? { role } : {}) });

    expect(names((await search('joao')).body.items)).toEqual(['João Pinto']);
    expect(names((await search('JOA')).body.items).sort()).toEqual(['Joana Rocha', 'João Pinto']);
    expect(names((await search('jo', 'student')).body.items)).toEqual(['João Pinto']);
    expect(names((await people(token, { role: 'instructor' })).body.items)).toEqual([
      'Joana Rocha',
    ]);
    expect((await people(token, { search: `${tag} zzzz` })).body).toMatchObject({
      items: [],
      total: 0,
    });
    expect(
      names((await people(token, { role: 'student,instructor' })).body.items).sort(),
    ).toEqual(['Ana Silva', 'Joana Rocha', 'João Pinto', 'Viewer']);
    expect((await people(token, { search: '  ' })).status).toBe(200);
  });

  it('matches %, _ and \\ literally', async () => {
    const viewer = await account({ name: 'Viewer' });
    await account({ name: 'Ab%c' });
    await account({ name: 'Ab_c' });
    await account({ name: 'Ab\\c' });
    await account({ name: 'Abxc' });

    const search = async (text: string) =>
      names((await people(viewer.accessToken, { search: `${tag} ${text}` })).body.items);

    expect(await search('Ab%')).toEqual(['Ab%c']);
    expect(await search('Ab_')).toEqual(['Ab_c']);
    expect(await search('Ab\\')).toEqual(['Ab\\c']);
    expect((await search('Ab')).sort()).toEqual(['Ab%c', 'Ab\\c', 'Ab_c', 'Abxc'].sort());
  });

  it('pages 20 at a time, A–Z', async () => {
    const viewer = await account({ name: 'User 00', createdAt: new Date('2026-09-01T00:00:00Z') });
    for (let index = 1; index < 25; index += 1) {
      await account({
        name: `User ${String(index).padStart(2, '0')}`,
        createdAt: new Date(Date.UTC(2026, 8, 1, 0, index)),
      });
    }

    const first = await people(viewer.accessToken);
    const second = await people(viewer.accessToken, { page: '2' });
    const past = await people(viewer.accessToken, { page: '3' });

    expect(first.body).toMatchObject({ page: 1, perPage: 20, total: 25 });
    expect(first.body.items).toHaveLength(20);
    expect(names(first.body.items)[0]).toBe('User 00');
    expect(names(second.body.items)).toEqual([
      'User 20',
      'User 21',
      'User 22',
      'User 23',
      'User 24',
    ]);
    expect(past.body).toMatchObject({ items: [], total: 25 });
    expect((await people(viewer.accessToken, { perPage: '50' })).body.items).toHaveLength(25);
  });

  it('breaks ties by id so pages never overlap', async () => {
    const createdAt = new Date('2026-09-01T00:00:00Z');
    const viewer = await account({ name: 'Same', createdAt });
    await account({ name: 'Same', createdAt });
    await account({ name: 'Same', createdAt });

    const first = await people(viewer.accessToken, { perPage: '2' });
    const second = await people(viewer.accessToken, { perPage: '2', page: '2' });
    const ids = [...first.body.items, ...second.body.items].map((item: Person) => item.id);

    expect(new Set(ids).size).toBe(3);
  });

  it('sorts A–Z by name ignoring case and accents', async () => {
    const viewer = await account({ name: 'Bruno' });
    await account({ name: 'ana' });
    await account({ name: 'Álvaro' });

    const response = await people(viewer.accessToken);

    expect(names(response.body.items)).toEqual(['Álvaro', 'ana', 'Bruno']);
  });

  it('refuses non-approved accounts', async () => {
    for (const role of ['student', 'instructor', 'admin'] as const) {
      for (const status of NOT_APPROVED) {
        const { accessToken } = await account({ role, status });
        const response = await people(accessToken, { page: '0' });

        expect(response.status).toBe(403);
        expect(response.body.errors).toEqual(['user.status.notApproved']);
      }
    }

    const missing = await people(undefined);
    expect(missing.status).toBe(401);
    expect(missing.body.errors).toEqual(['auth.token.invalid']);
  });

  it('validates the query', async () => {
    const viewer = await account();

    const response = await people(viewer.accessToken, {
      page: '0',
      perPage: '51',
      role: 'guest',
      search: 'a'.repeat(81),
    });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual([
      'people.page.invalid',
      'people.perPage.invalid',
      'people.role.invalid',
      'people.search.max.length',
    ]);
    expect((await people(viewer.accessToken, { page: 'abc' })).status).toBe(422);
    expect((await people(viewer.accessToken, { perPage: '1.5' })).status).toBe(422);
  });
});
