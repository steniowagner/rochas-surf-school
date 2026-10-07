import { CronExpression } from '@nestjs/schedule';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SignInCodeCleanupJob } from './sign-in-code-cleanup.job.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-07T12:00:00.000Z');

function setup(deleted: number) {
  const repository = { deleteExpired: vi.fn().mockResolvedValue(deleted) };
  const job = new SignInCodeCleanupJob(
    repository as unknown as PrismaSignInCodeRepository,
    { now: () => NOW } as SystemClockProvider,
  );
  return { job, repository };
}

describe('SignInCodeCleanupJob', () => {
  it('runs every minute', () => {
    const handler = Object.getOwnPropertyDescriptor(SignInCodeCleanupJob.prototype, 'run')!
      .value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
    });
  });

  it('deletes the codes that expired before now', async () => {
    const { job, repository } = setup(3);

    await expect(job.run()).resolves.toEqual({ deleted: 3 });
    expect(repository.deleteExpired).toHaveBeenCalledWith(NOW);
  });

  it('does nothing and does not fail when nothing expired', async () => {
    const { job } = setup(0);

    await expect(job.run()).resolves.toEqual({ deleted: 0 });
  });
});
