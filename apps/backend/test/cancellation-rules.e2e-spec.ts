import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { SystemClockProvider } from '../src/modules/classes/system.clock.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'cancellation-rules.e2e.example.com';
const MARK = 'e2erule';
// Sunday 2026-10-18, 09:00 in Fortaleza.
const NOW = new Date('2026-10-18T12:00:00.000Z');
const RULE = 'O aluno pode cancelar até 12 horas antes do início da aula.';

type Role = 'student' | 'instructor' | 'admin';
type Status = 'pending' | 'approved' | 'denied' | 'deleted' | 'removed';

const NOT_APPROVED: Status[] = ['pending', 'denied', 'deleted', 'removed'];

describe('Cancellation rules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let locationId: string;
  let savedRules: Awaited<ReturnType<PrismaService['cancellationRule']['findMany']>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(SystemClockProvider)
      .useValue({ now: () => new Date(NOW.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
    // The rules are two global rows: keep what the database had and put it back afterwards.
    savedRules = await prisma.cancellationRule.findMany();
    await prisma.cancellationRule.deleteMany();
    locationId = (
      await prisma.location.create({
        data: {
          id: randomUUID(),
          name: `${MARK} ${randomUUID().slice(0, 8)}`,
          nameKey: `${MARK} ${randomUUID()}`,
          address: 'Av. Beira Mar',
        },
      })
    ).id;
  });

  afterEach(async () => {
    await prisma.schoolClass.deleteMany({ where: { creator: { email: { endsWith: `@${DOMAIN}` } } } });
    await prisma.location.deleteMany({ where: { name: { startsWith: MARK } } });
    await prisma.cancellationRule.deleteMany();
    await prisma.cancellationRule.createMany({ data: savedRules });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    token === undefined ? req : req.set('Authorization', `Bearer ${token}`);

  async function account(role: Role = 'admin', status: Status = 'approved') {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: `Person ${role}`,
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role,
        status,
      },
    });
    return { id: user.id, accessToken: tokens.signAccessToken(user).token };
  }

  const list = (token: string | undefined) => as(token, http().get('/cancellation-rules'));
  const save = (token: string | undefined, discipline: string, body?: unknown) =>
    as(token, http().put(`/cancellation-rules/${discipline}`)).send(body as object);

  async function classAt(
    creatorId: string,
    discipline: 'surf' | 'skate',
    startsAt: Date,
    extra: Record<string, unknown> = {},
  ) {
    return prisma.schoolClass.create({
      data: {
        id: randomUUID(),
        discipline,
        level: 'beginner',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
        locationId,
        capacity: 8,
        createdBy: creatorId,
        cancellationDeadline: new Date(startsAt.getTime() - 12 * 3_600_000),
        ...extra,
      },
    });
  }

  const deadlineOf = async (token: string, id: string) =>
    (await as(token, http().get(`/classes/${id}`))).body.cancellationDeadline as string | null;

  describe('GET /cancellation-rules', () => {
    it('answers both rules to any approved account', async () => {
      const admin = await account('admin');
      await save(admin.accessToken, 'surf', { text: RULE }).expect(200);

      for (const role of ['student', 'instructor', 'admin'] as const) {
        const person = await account(role);
        const response = await list(person.accessToken).expect(200);

        expect(response.body).toEqual({ surf: RULE, skate: null });
      }
    });

    it('answers null for both when there is no rule', async () => {
      const student = await account('student');

      const response = await list(student.accessToken).expect(200);

      expect(response.body).toEqual({ surf: null, skate: null });
    });

    it.each(NOT_APPROVED)('refuses a %s account', async (status) => {
      const person = await account('student', status);

      const response = await list(person.accessToken).expect(403);

      expect(response.body.errors).toEqual(['user.status.notApproved']);
    });

    it('refuses a missing token', async () => {
      await list(undefined).expect(401);
    });
  });

  describe('PUT /cancellation-rules', () => {
    it('saves the trimmed text and keeps the other rule', async () => {
      const admin = await account('admin');
      await save(admin.accessToken, 'surf', { text: RULE }).expect(200);

      const response = await save(admin.accessToken, 'skate', {
        text: '  Até 6 horas antes do início.  ',
      }).expect(200);

      expect(response.body).toEqual({ surf: RULE, skate: 'Até 6 horas antes do início.' });
      expect((await list(admin.accessToken)).body).toEqual(response.body);
      expect((await prisma.cancellationRule.findUnique({ where: { discipline: 'skate' } }))?.updatedBy).toBe(admin.id);
    });

    it('replaces the text: the last save wins', async () => {
      const admin = await account('admin');

      await save(admin.accessToken, 'surf', { text: 'Primeira.' }).expect(200);
      const response = await save(admin.accessToken, 'surf', { text: 'Segunda.' }).expect(200);

      expect(response.body.surf).toBe('Segunda.');
      expect(await prisma.cancellationRule.count()).toBe(1);
    });

    it('accepts 2000 characters', async () => {
      const admin = await account('admin');

      const response = await save(admin.accessToken, 'surf', { text: 'a'.repeat(2000) }).expect(200);

      expect(response.body.surf).toHaveLength(2000);
    });

    it.each([
      ['kitesurf', { text: 'x' }, ['cancellationRule.discipline.invalid']],
      ['surf', {}, ['cancellationRule.text.required']],
      ['surf', { text: null }, ['cancellationRule.text.required']],
      ['surf', { text: 5 }, ['cancellationRule.text.required']],
      ['surf', { text: '   ' }, ['cancellationRule.text.required']],
      ['surf', { text: 'a'.repeat(2001) }, ['cancellationRule.text.max.length']],
    ])('refuses %s with %j and stores nothing', async (discipline, body, errors) => {
      const admin = await account('admin');

      const response = await save(admin.accessToken, discipline, body).expect(422);

      expect(response.body.errors).toEqual(errors);
      expect(await prisma.cancellationRule.count()).toBe(0);
    });

    it('refuses a student and an instructor', async () => {
      for (const role of ['student', 'instructor'] as const) {
        const person = await account(role);

        const response = await save(person.accessToken, 'surf', { text: RULE }).expect(403);

        expect(response.body.errors).toEqual(['user.role.notAdmin']);
      }
      expect(await prisma.cancellationRule.count()).toBe(0);
    });

    it.each(NOT_APPROVED)('refuses a %s admin', async (status) => {
      const person = await account('admin', status);

      const response = await save(person.accessToken, 'surf', { text: RULE }).expect(403);

      expect(response.body.errors).toEqual(['user.status.notApproved']);
    });

    it('refuses a missing token', async () => {
      await save(undefined, 'surf', { text: RULE }).expect(401);
    });
  });

  describe('clears the deadlines', () => {
    const tomorrow = new Date('2026-10-19T11:00:00.000Z');
    const yesterday = new Date('2026-10-17T11:00:00.000Z');

    async function seed(admin: { id: string }) {
      return {
        upcoming: await classAt(admin.id, 'surf', tomorrow),
        started: await classAt(admin.id, 'surf', yesterday),
        cancelled: await classAt(admin.id, 'surf', tomorrow, { cancelledAt: new Date('2026-10-18T10:00:00.000Z') }),
        skate: await classAt(admin.id, 'skate', tomorrow),
      };
    }

    it('of the upcoming classes of the discipline when its rule changes', async () => {
      const admin = await account('admin');
      await save(admin.accessToken, 'surf', { text: RULE }).expect(200);
      const { upcoming, started, cancelled, skate } = await seed(admin);

      await save(admin.accessToken, 'surf', { text: 'Outra regra.' }).expect(200);

      expect(await deadlineOf(admin.accessToken, upcoming.id)).toBeNull();
      expect(await deadlineOf(admin.accessToken, started.id)).not.toBeNull();
      expect(await deadlineOf(admin.accessToken, cancelled.id)).not.toBeNull();
      expect(await deadlineOf(admin.accessToken, skate.id)).not.toBeNull();
      expect((await prisma.schoolClass.findUnique({ where: { id: upcoming.id } }))?.deadlineRevision).toBe(1);
    });

    it('keeps every deadline when the same text is saved again', async () => {
      const admin = await account('admin');
      await save(admin.accessToken, 'surf', { text: RULE }).expect(200);
      const { upcoming } = await seed(admin);

      await save(admin.accessToken, 'surf', { text: `  ${RULE}  ` }).expect(200);

      expect(await deadlineOf(admin.accessToken, upcoming.id)).not.toBeNull();
    });

    it('when the first rule of the discipline is saved', async () => {
      const admin = await account('admin');
      const { upcoming, skate } = await seed(admin);

      await save(admin.accessToken, 'surf', { text: RULE }).expect(200);

      expect(await deadlineOf(admin.accessToken, upcoming.id)).toBeNull();
      expect(await deadlineOf(admin.accessToken, skate.id)).not.toBeNull();
    });

    it('never, when the save is refused', async () => {
      const admin = await account('admin');
      const student = await account('student');
      const { upcoming } = await seed(admin);

      await save(admin.accessToken, 'surf', { text: '   ' }).expect(422);
      await save(student.accessToken, 'surf', { text: RULE }).expect(403);

      expect(await deadlineOf(admin.accessToken, upcoming.id)).not.toBeNull();
    });
  });
});
