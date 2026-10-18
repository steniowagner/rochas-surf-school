import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CancellationDeadlineDescription,
  CancellationDeadlineRequest,
} from '@rochas-surf-school/classes';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/db/prisma.service.js';
import { JwtTokenProvider } from '../src/modules/auth/jwt.token.js';
import { AnthropicDeadlineDescriber } from '../src/modules/classes/anthropic.deadline-describer.js';
import { CancellationDeadlineJob } from '../src/modules/classes/cancellation-deadline.job.js';
import { SystemClockProvider } from '../src/modules/classes/system.clock.js';

// Secrets the backend refuses to start without; CI has no .env.
process.env.AUTH_CODE_PEPPER ??= 'e2e-pepper';
process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';

const DOMAIN = 'cancellation-deadlines.e2e.example.com';
const MARK = 'e2edeadline';
// Sunday 2037-10-18 (a year no real class is in, so the job only meets the classes of the test), 09:00 in Fortaleza.
const NOW = new Date('2037-10-18T12:00:00.000Z');
const MINUTE = 60_000;
const RULE = 'O aluno pode cancelar até 12 horas antes do início da aula.';

type Answer =
  | CancellationDeadlineDescription
  | ((request: CancellationDeadlineRequest) => Promise<CancellationDeadlineDescription>);

/** Records the requests instead of calling Anthropic. */
class FakeDescriber {
  requests: CancellationDeadlineRequest[] = [];
  answer: Answer = { kind: 'minutesBefore', minutes: 720 };

  async describe(req: CancellationDeadlineRequest): Promise<CancellationDeadlineDescription> {
    this.requests.push(req);
    return typeof this.answer === 'function' ? this.answer(req) : this.answer;
  }
}

describe('Cancellation deadlines (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: JwtTokenProvider;
  let job: CancellationDeadlineJob;
  let describer: FakeDescriber;
  let now: Date;
  let locationId: string;
  let admin: { id: string; accessToken: string };
  let savedRules: Awaited<ReturnType<PrismaService['cancellationRule']['findMany']>>;

  beforeEach(async () => {
    describer = new FakeDescriber();
    now = NOW;
    const moduleRef = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    })
      .overrideProvider(AnthropicDeadlineDescriber)
      .useValue(describer)
      .overrideProvider(SystemClockProvider)
      .useValue({ now: () => new Date(now.getTime()) })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(JwtTokenProvider, { strict: false });
    job = app.get(CancellationDeadlineJob);
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
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: 'Person admin',
        email: `u.${randomUUID().slice(0, 8)}@${DOMAIN}`,
        role: 'admin',
        status: 'approved',
      },
    });
    admin = { id: user.id, accessToken: tokens.signAccessToken(user).token };
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
  const authed = (req: request.Test) => req.set('Authorization', `Bearer ${admin.accessToken}`);

  const saveRule = (discipline: 'surf' | 'skate', text = RULE) =>
    authed(http().put(`/cancellation-rules/${discipline}`)).send({ text }).expect(200);

  async function createClass(discipline: 'surf' | 'skate' = 'surf', date = '2037-10-20'): Promise<string> {
    await authed(http().post('/classes/batch'))
      .send({
        discipline,
        level: 'beginner',
        startDate: date,
        endDate: date,
        weekdays: [new Date(`${date}T12:00:00Z`).getUTCDay() || 7],
        timeRanges: [{ start: '08:00', end: '09:00' }],
        locationId,
        instructorIds: [admin.id],
        capacity: 8,
      })
      .expect(201);
    const created = await prisma.schoolClass.findFirstOrThrow({
      where: { createdBy: admin.id, discipline },
      orderBy: { createdAt: 'desc' },
    });
    return created.id;
  }

  const get = async (id: string) => (await authed(http().get(`/classes/${id}`)).expect(200)).body;
  const row = (id: string) => prisma.schoolClass.findUniqueOrThrow({ where: { id } });
  const editBody = (overrides: Record<string, unknown> = {}) => ({
    discipline: 'surf',
    level: 'beginner',
    date: '2037-10-20',
    start: '08:00',
    end: '09:00',
    locationId,
    instructorIds: [admin.id],
    capacity: 8,
    ...overrides,
  });
  const edit = (id: string, overrides: Record<string, unknown> = {}) =>
    authed(http().put(`/classes/${id}`)).send(editBody(overrides));

  it('works out the deadline in the background after a class is created', async () => {
    await saveRule('surf');
    describer.answer = { kind: 'minutesBefore', minutes: 720 };

    const id = await createClass();

    expect((await get(id)).cancellationDeadline).toBeNull();

    expect(await job.run()).toEqual({ workedOut: 1, failed: 0 });

    expect((await get(id)).cancellationDeadline).toBe('2037-10-19T23:00:00.000Z');
    const week = await authed(http().get('/classes?date=2037-10-20')).expect(200);
    expect(week.body.items.find((item: { id: string }) => item.id === id).cancellationDeadline).toBe(
      '2037-10-19T23:00:00.000Z',
    );
    expect(describer.requests).toHaveLength(1);
    expect(describer.requests[0]).toMatchObject({
      rule: RULE,
      class: { discipline: 'surf', date: '2037-10-20', weekday: 'Tuesday', start: '08:00', end: '09:00', notes: null },
    });

    expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
    expect(describer.requests).toHaveLength(1);
  });

  it('retries an unusable answer with backoff and notifies nobody', async () => {
    await saveRule('surf');
    describer.answer = { kind: 'unclear' };
    const id = await createClass();
    const notifications = () => prisma.notification.count({ where: { userId: admin.id } });
    const before = await notifications();
    const waits: number[] = [];

    for (const wait of [1, 2, 4, 8]) {
      expect(await job.run()).toEqual({ workedOut: 0, failed: 1 });
      const stored = await row(id);
      waits.push((stored.deadlineNextAttemptAt!.getTime() - now.getTime()) / MINUTE);
      expect(stored.cancellationDeadline).toBeNull();

      now = new Date(stored.deadlineNextAttemptAt!.getTime() - MINUTE / 2);
      expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
      now = stored.deadlineNextAttemptAt!;
      expect(waits.at(-1)).toBe(wait);
    }
    expect(describer.requests).toHaveLength(4);

    describer.answer = { kind: 'minutesBefore', minutes: 60 };
    expect(await job.run()).toEqual({ workedOut: 1, failed: 0 });

    const stored = await row(id);
    expect(stored.cancellationDeadline).not.toBeNull();
    expect(stored.deadlineAttempts).toBe(0);
    expect(await notifications()).toBe(before);
  });

  it('counts a describer that throws as a failed attempt', async () => {
    await saveRule('surf');
    describer.answer = async () => Promise.reject(new Error('down'));
    const id = await createClass();

    expect(await job.run()).toEqual({ workedOut: 0, failed: 1 });

    expect((await row(id)).deadlineAttempts).toBe(1);
  });

  it('sends nothing without a rule, and works the class out once the rule is saved (without a rule)', async () => {
    await saveRule('surf');
    const id = await createClass('skate');

    expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
    expect(describer.requests).toHaveLength(0);
    expect((await row(id)).deadlineAttempts).toBe(0);

    await saveRule('skate', 'Até 6 horas antes.');
    describer.answer = { kind: 'minutesBefore', minutes: 360 };
    expect(await job.run()).toEqual({ workedOut: 1, failed: 0 });

    expect((await get(id)).cancellationDeadline).toBe('2037-10-20T05:00:00.000Z');
    expect(describer.requests[0].rule).toBe('Até 6 horas antes.');
  });

  describe('edit', () => {
    async function withDeadline() {
      await saveRule('surf');
      describer.answer = { kind: 'minutesBefore', minutes: 720 };
      const id = await createClass();
      await job.run();
      expect((await get(id)).cancellationDeadline).toBe('2037-10-19T23:00:00.000Z');
      return id;
    }

    it('clears the deadline when the start changes, and the next run works out the new one', async () => {
      const id = await withDeadline();

      const response = await edit(id, { start: '10:00', end: '11:00' }).expect(200);

      expect(response.body).toMatchObject({ id, cancellationDeadline: null });
      expect((await get(id)).cancellationDeadline).toBeNull();

      await job.run();
      expect((await get(id)).cancellationDeadline).toBe('2037-10-20T01:00:00.000Z');
    });

    it.each([
      ['level', { level: 'advanced' }],
      ['capacity', { capacity: 9 }],
      ['end', { end: '09:30' }],
      ['notes', { notes: 'Trazer protetor.' }],
      ['discipline', { discipline: 'skate' }],
    ])('clears the deadline when the %s changes', async (_field, change) => {
      const id = await withDeadline();

      await edit(id, change).expect(200);

      expect((await get(id)).cancellationDeadline).toBeNull();
    });

    it('keeps the deadline when only the instructors change or nothing does', async () => {
      const id = await withDeadline();
      const other = await prisma.user.create({
        data: {
          id: randomUUID(),
          name: 'Person instructor',
          email: `i.${randomUUID().slice(0, 8)}@${DOMAIN}`,
          role: 'instructor',
          status: 'approved',
        },
      });

      await edit(id, { instructorIds: [admin.id, other.id] }).expect(200);
      expect((await get(id)).cancellationDeadline).toBe('2037-10-19T23:00:00.000Z');

      await edit(id, { instructorIds: [admin.id, other.id] }).expect(200);
      expect((await get(id)).cancellationDeadline).toBe('2037-10-19T23:00:00.000Z');
    });
  });

  describe('stale results', () => {
    it('drops a result when the class is edited during the call, and works it out again', async () => {
      await saveRule('surf');
      const id = await createClass();
      describer.answer = async () => {
        await edit(id, { start: '10:00', end: '11:00' }).expect(200);
        return { kind: 'minutesBefore', minutes: 720 };
      };

      expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
      expect((await get(id)).cancellationDeadline).toBeNull();

      describer.answer = { kind: 'minutesBefore', minutes: 60 };
      expect(await job.run()).toEqual({ workedOut: 1, failed: 0 });
      expect((await get(id)).cancellationDeadline).toBe('2037-10-20T12:00:00.000Z');
    });

    it('drops a result when the rule changes during the call', async () => {
      await saveRule('surf');
      const id = await createClass();
      describer.answer = async () => {
        await saveRule('surf', 'Outra regra.');
        return { kind: 'minutesBefore', minutes: 720 };
      };

      expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
      expect((await get(id)).cancellationDeadline).toBeNull();
    });

    it('never picks, and never writes to, a cancelled class', async () => {
      await saveRule('surf');
      const id = await createClass();
      describer.answer = async () => {
        await authed(http().post(`/classes/${id}/cancel`)).send({}).expect(200);
        return { kind: 'classStart' };
      };

      expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
      expect((await get(id)).cancellationDeadline).toBeNull();

      describer.requests = [];
      expect(await job.run()).toEqual({ workedOut: 0, failed: 0 });
      expect(describer.requests).toHaveLength(0);
    });
  });
});
