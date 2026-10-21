import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { GuestErasureJob } from './guest-erasure.job.js';
import type { PrismaGuestRepository } from './guest.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-19T11:30:00.000Z');

function setup(eraseEndedBefore: () => Promise<number> = async () => 2) {
  const repository = { eraseEndedBefore: vi.fn(eraseEndedBefore) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new GuestErasureJob(
    repository as unknown as PrismaGuestRepository,
    { now: () => NOW } as SystemClockProvider,
  );

  return { job, repository, log, error };
}

describe('GuestErasureJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute, waiting for the previous run', () => {
    const handler = Object.getOwnPropertyDescriptor(GuestErasureJob.prototype, 'run')!.value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
      name: 'guest-erasure',
      waitForCompletion: true,
    });
  });

  it('erases the guests of the classes over 30 days ago and logs only the count', async () => {
    const { job, repository, log } = setup();

    await expect(job.run()).resolves.toEqual({ erased: 2 });

    expect(repository.eraseEndedBefore).toHaveBeenCalledWith(new Date('2026-09-19T11:30:00.000Z'), NOW);
    expect(log).toHaveBeenCalledWith('Guest erasure: 2 erased');
  });

  it('logs nothing when nobody was erased', async () => {
    const { job, log } = setup(async () => 0);

    await expect(job.run()).resolves.toEqual({ erased: 0 });
    expect(log).not.toHaveBeenCalled();
  });

  it('never throws: it logs the failure and answers none erased', async () => {
    const { job, error } = setup(async () => {
      throw new Error('db down');
    });

    await expect(job.run()).resolves.toEqual({ erased: 0 });
    expect(error).toHaveBeenCalledWith('Could not erase the guests data', expect.stringContaining('db down'));
  });

  it('logs a failure that is not an Error', async () => {
    const { job, error } = setup(() => Promise.reject('boom'));

    await expect(job.run()).resolves.toEqual({ erased: 0 });
    expect(error).toHaveBeenCalledWith('Could not erase the guests data', 'boom');
  });
});
