import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { NotificationsRegistrationNotificationEraser } from '../notifications/notifications.registration-notification-eraser.js';
import { AccountErasureJob } from './account-erasure.job.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

const NOW = new Date('2026-11-12T12:00:00.000Z');
const CUTOFF = new Date('2026-10-13T12:00:00.000Z');

function setup(options: { due?: string[]; deleted?: number } = {}) {
  const userRepository = {
    findDeniedBefore: vi.fn().mockResolvedValue(options.due ?? []),
    deleteDenied: vi.fn().mockResolvedValue(options.deleted ?? 0),
  };
  const eraser = { erase: vi.fn().mockResolvedValue(undefined) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new AccountErasureJob(
    userRepository as unknown as PrismaUserRepository,
    eraser as unknown as NotificationsRegistrationNotificationEraser,
    { now: () => NOW } as SystemClockProvider,
  );
  return { job, userRepository, eraser, log, error };
}

describe('AccountErasureJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute, waiting for the previous run', () => {
    const handler = Object.getOwnPropertyDescriptor(AccountErasureJob.prototype, 'run')!
      .value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
      name: 'account-erasure',
      waitForCompletion: true,
    });
  });

  it('erases the accounts due and logs only the count', async () => {
    const { job, userRepository, eraser, log } = setup({ due: ['secret-id'], deleted: 1 });

    await expect(job.run()).resolves.toEqual({ erased: 1 });

    expect(userRepository.findDeniedBefore).toHaveBeenCalledWith(CUTOFF);
    expect(eraser.erase).toHaveBeenCalledWith(['secret-id']);
    expect(userRepository.deleteDenied).toHaveBeenCalledWith(['secret-id']);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toBe('Erased 1 denied registration(s)');
  });

  it('logs nothing when nothing is due', async () => {
    const { job, eraser, log } = setup();

    await expect(job.run()).resolves.toEqual({ erased: 0 });

    expect(eraser.erase).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('logs the error and resolves when a step fails', async () => {
    const { job, userRepository, eraser, error } = setup({ due: ['id'] });
    eraser.erase.mockRejectedValue(new Error('db down'));

    await expect(job.run()).resolves.toEqual({ erased: 0 });

    expect(userRepository.deleteDenied).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Could not erase the denied registrations', expect.any(String));
  });

  it('logs a thrown value that is not an Error', async () => {
    const { job, userRepository, error } = setup();
    userRepository.findDeniedBefore.mockRejectedValue('boom');

    await expect(job.run()).resolves.toEqual({ erased: 0 });

    expect(error).toHaveBeenCalledWith('Could not erase the denied registrations', 'boom');
  });
});
