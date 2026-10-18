import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { CancellationRule, SchoolClass } from '@rochas-surf-school/classes';
import { AnthropicDeadlineDescriber } from './anthropic.deadline-describer.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';
import { CancellationDeadlineJob } from './cancellation-deadline.job.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-18T12:00:00.000Z');
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const LOCATION_ID = 'c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65';

function schoolClass() {
  return new SchoolClass({
    discipline: 'surf',
    level: 'beginner',
    startsAt: new Date('2026-10-20T11:00:00.000Z'),
    endsAt: new Date('2026-10-20T12:00:00.000Z'),
    locationId: LOCATION_ID,
    instructorIds: [ADMIN_ID],
    capacity: 8,
    createdBy: ADMIN_ID,
  });
}

function setup(options: { findNeedingDeadline?: () => Promise<SchoolClass[]> } = {}) {
  const item = schoolClass();
  const classes = {
    findNeedingDeadline: vi.fn(options.findNeedingDeadline ?? (async () => [item])),
    saveDeadline: vi.fn().mockResolvedValue(true),
    recordDeadlineFailure: vi.fn().mockResolvedValue(true),
  };
  const rules = {
    findAll: vi.fn().mockResolvedValue([
      new CancellationRule({ discipline: 'surf', text: 'REGRA SECRETA', updatedBy: ADMIN_ID }),
    ]),
  };
  const locations = {
    findById: vi.fn().mockResolvedValue({ name: 'Praia Secreta', address: 'Rua Secreta' }),
  };
  const describer = { describe: vi.fn().mockResolvedValue({ kind: 'minutesBefore', minutes: 60 }) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new CancellationDeadlineJob(
    classes as unknown as PrismaSchoolClassRepository,
    rules as unknown as PrismaCancellationRuleRepository,
    locations as unknown as PrismaLocationRepository,
    describer as unknown as AnthropicDeadlineDescriber,
    { now: () => NOW } as SystemClockProvider,
  );
  return { job, item, classes, rules, describer, log, error };
}

describe('CancellationDeadlineJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute, waiting for the previous run', () => {
    const handler = Object.getOwnPropertyDescriptor(CancellationDeadlineJob.prototype, 'run')!
      .value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
      name: 'cancellation-deadline',
      waitForCompletion: true,
    });
  });

  it('works the classes out and logs only the counts', async () => {
    const { job, item, classes, log } = setup();

    await expect(job.run()).resolves.toEqual({ workedOut: 1, failed: 0 });

    expect(classes.findNeedingDeadline).toHaveBeenCalledWith({
      now: NOW,
      disciplines: ['surf'],
      limit: 20,
    });
    expect(classes.saveDeadline).toHaveBeenCalledWith(
      item.id,
      0,
      new Date('2026-10-20T10:00:00.000Z'),
    );
    expect(log).toHaveBeenCalledWith('Cancellation deadlines: 1 worked out, 0 failed');
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain('SECRETA');
  });

  it('logs the failures and nothing when nothing was due', async () => {
    const failing = setup();
    failing.describer.describe.mockResolvedValue({ kind: 'unclear' });
    await expect(failing.job.run()).resolves.toEqual({ workedOut: 0, failed: 1 });
    expect(failing.log).toHaveBeenCalledWith('Cancellation deadlines: 0 worked out, 1 failed');

    const idle = setup({ findNeedingDeadline: async () => [] });
    idle.log.mockClear();
    await expect(idle.job.run()).resolves.toEqual({ workedOut: 0, failed: 0 });
    expect(idle.log).not.toHaveBeenCalled();
  });

  it('catches and logs an error without throwing or leaking the rule', async () => {
    const { job, error } = setup({
      findNeedingDeadline: async () => {
        throw new Error('db down');
      },
    });

    await expect(job.run()).resolves.toEqual({ workedOut: 0, failed: 0 });

    expect(error).toHaveBeenCalledWith(
      'Could not work out the cancellation deadlines',
      expect.stringContaining('db down'),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('SECRETA');
  });

  it('logs a thrown non-error as text', async () => {
    const { job, error } = setup({
      findNeedingDeadline: async () => Promise.reject('plain text'),
    });

    await job.run();

    expect(error).toHaveBeenCalledWith('Could not work out the cancellation deadlines', 'plain text');
  });
});
