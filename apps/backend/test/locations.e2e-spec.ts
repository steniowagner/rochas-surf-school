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

const DOMAIN = 'locations.e2e.example.com';
// Every location this suite creates starts with this mark, so it can delete them without touching real ones.
const MARK = 'e2eloc';
const ADDRESS = 'Av. Zezé Diogo, 5000 – Fortaleza';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

interface LocationBody {
  id: string;
  name: string;
  address: string;
}

describe('Locations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
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
    tag = `${MARK} ${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  });

  afterEach(async () => {
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function account(role: Role = 'admin', status: Status = 'approved') {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${randomUUID().slice(0, 6)}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        status,
        role,
      },
    });
    return tokens.signAccessToken(user).token;
  }

  const create = (token: string, body: Record<string, unknown>) =>
    http().post('/locations').set('Authorization', `Bearer ${token}`).send(body);

  const list = (token: string) => http().get('/locations').set('Authorization', `Bearer ${token}`);

  const mine = (items: LocationBody[]) =>
    items.filter((item) => item.name.startsWith(MARK)).map((item) => item.name.replace(`${tag} `, ''));

  it('creates a location with the trimmed name and address, and lists it', async () => {
    const admin = await account();

    const created = await create(admin, { name: ` ${tag} Praia do Futuro `, address: ` ${ADDRESS} ` });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      name: `${tag} Praia do Futuro`,
      address: ADDRESS,
    });

    const listed = await list(admin);

    expect(listed.status).toBe(200);
    expect(listed.body.items).toContainEqual(created.body);
  });

  it('lists by name ignoring case and accents', async () => {
    const admin = await account();
    for (const name of ['zeta', 'Água', 'beta', 'Álamo']) {
      await create(admin, { name: `${tag} ${name}`, address: ADDRESS });
    }

    const listed = await list(admin);

    expect(mine(listed.body.items)).toEqual(['Água', 'Álamo', 'beta', 'zeta']);
  });

  it('refuses a duplicated name ignoring case and accents', async () => {
    const admin = await account();
    await create(admin, { name: `${tag} Praia do Futuro`, address: ADDRESS });

    for (const name of [`${tag} praia do futuro`, `${tag} Práia do FUTURO`]) {
      const response = await create(admin, { name, address: 'Outro' });

      expect(response.status).toBe(409);
      expect(response.body.errors).toEqual(['location.name.duplicate']);
    }
    expect(mine((await list(admin)).body.items)).toEqual(['Praia do Futuro']);
  });

  it('leaves one location when two creations of the same name run together', async () => {
    const admin = await account();
    const name = `${tag} Praia`;

    const responses = await Promise.all([
      create(admin, { name, address: ADDRESS }),
      create(admin, { name, address: ADDRESS }),
    ]);

    expect(responses.map((item) => item.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(mine((await list(admin)).body.items)).toEqual(['Praia']);
  });

  it('collects the validation errors', async () => {
    const admin = await account();

    const empty = await create(admin, { name: '', address: '' });
    const tooLong = await create(admin, { name: 'n'.repeat(41), address: 'a'.repeat(201) });
    const missing = await http().post('/locations').set('Authorization', `Bearer ${admin}`);

    expect(empty.status).toBe(422);
    expect(empty.body.errors).toEqual(['location.name.required', 'location.address.required']);
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.errors).toEqual(['location.name.max.length', 'location.address.max.length']);
    expect(missing.status).toBe(422);
    expect(missing.body.errors).toEqual(['location.name.required', 'location.address.required']);
  });

  describe('access', () => {
    it('answers 401 without a token', async () => {
      const [read, write] = await Promise.all([
        http().get('/locations'),
        http().post('/locations').send({ name: `${tag} x`, address: ADDRESS }),
      ]);

      expect(read.status).toBe(401);
      expect(read.body.errors).toEqual(['auth.token.invalid']);
      expect(write.status).toBe(401);
    });

    it.each(NOT_APPROVED)('refuses an account that is %s', async (status) => {
      const token = await account('admin', status);

      const read = await list(token);
      const write = await create(token, { name: `${tag} x`, address: ADDRESS });

      expect(read.status).toBe(403);
      expect(read.body.errors).toEqual(['user.status.notApproved']);
      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.status.notApproved']);
    });

    it.each(['student', 'instructor'] as const)('lets an approved %s read but not create', async (role) => {
      const admin = await account();
      await create(admin, { name: `${tag} Praia`, address: ADDRESS });
      const token = await account(role);

      const read = await list(token);
      const write = await create(token, { name: `${tag} Outra`, address: ADDRESS });

      expect(read.status).toBe(200);
      expect(mine(read.body.items)).toEqual(['Praia']);
      expect(write.status).toBe(403);
      expect(write.body.errors).toEqual(['user.role.notAdmin']);
      expect(mine((await list(admin)).body.items)).toEqual(['Praia']);
    });
  });
});
