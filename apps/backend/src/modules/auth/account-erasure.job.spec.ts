import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { NotificationsPersonNotificationEraser } from '../notifications/notifications.person-notification-eraser.js';
import { NotificationsRegistrationNotificationEraser } from '../notifications/notifications.registration-notification-eraser.js';
import { AccountErasureJob } from './account-erasure.job.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

const NOW = new Date('2026-11-12T12:00:00.000Z');
const CUTOFF = new Date('2026-10-13T12:00:00.000Z');

function setup(
  options: { denied?: string[]; deleted?: number; closed?: string[]; erased?: number } = {},
) {
  const userRepository = {
    findDeniedBefore: vi.fn().mockResolvedValue(options.denied ?? []),
    deleteDenied: vi.fn().mockResolvedValue(options.deleted ?? 0),
    findClosedBefore: vi.fn().mockResolvedValue(options.closed ?? []),
    eraseClosed: vi.fn().mockResolvedValue(options.erased ?? 0),
  };
  const registrationEraser = { erase: vi.fn().mockResolvedValue(undefined) };
  const personEraser = { erase: vi.fn().mockResolvedValue(undefined) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new AccountErasureJob(
    userRepository as unknown as PrismaUserRepository,
    registrationEraser as unknown as NotificationsRegistrationNotificationEraser,
    personEraser as unknown as NotificationsPersonNotificationEraser,
    { now: () => NOW } as SystemClockProvider,
  );
  return { job, userRepository, registrationEraser, personEraser, log, error };
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

  it('erases the denied registrations, then the closed accounts, and logs one count line per kind', async () => {
    const { job, userRepository, registrationEraser, personEraser, log } = setup({
      denied: ['secret-denied'],
      deleted: 1,
      closed: ['secret-a', 'secret-b'],
      erased: 2,
    });

    await expect(job.run()).resolves.toEqual({ deniedRegistrations: 1, closedAccounts: 2 });

    expect(userRepository.findDeniedBefore).toHaveBeenCalledWith(CUTOFF);
    expect(registrationEraser.erase).toHaveBeenCalledWith(['secret-denied']);
    expect(userRepository.deleteDenied).toHaveBeenCalledWith(['secret-denied']);
    expect(userRepository.findClosedBefore).toHaveBeenCalledWith(CUTOFF);
    expect(personEraser.erase).toHaveBeenCalledWith(['secret-a', 'secret-b']);
    expect(userRepository.eraseClosed).toHaveBeenCalledWith(['secret-a', 'secret-b'], CUTOFF);
    expect(userRepository.deleteDenied.mock.invocationCallOrder[0]).toBeLessThan(
      userRepository.findClosedBefore.mock.invocationCallOrder[0]!,
    );
    expect(log.mock.calls.map((call) => call[0])).toEqual([
      'Erased 1 denied registration(s)',
      'Erased 2 closed account(s)',
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
  });

  it('logs nothing when nothing is due', async () => {
    const { job, registrationEraser, personEraser, log } = setup();

    await expect(job.run()).resolves.toEqual({ deniedRegistrations: 0, closedAccounts: 0 });

    expect(registrationEraser.erase).not.toHaveBeenCalled();
    expect(personEraser.erase).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('still erases the closed accounts when the denied-registration erasure fails', async () => {
    const { job, userRepository, registrationEraser, log, error } = setup({
      denied: ['id'],
      closed: ['closed-id'],
      erased: 1,
    });
    registrationEraser.erase.mockRejectedValue(new Error('db down'));

    await expect(job.run()).resolves.toEqual({ deniedRegistrations: 0, closedAccounts: 1 });

    expect(userRepository.deleteDenied).not.toHaveBeenCalled();
    expect(userRepository.eraseClosed).toHaveBeenCalledWith(['closed-id'], CUTOFF);
    expect(error).toHaveBeenCalledWith('Could not erase the denied registration(s)', expect.any(String));
    expect(log.mock.calls.map((call) => call[0])).toEqual(['Erased 1 closed account(s)']);
  });

  it('still erases the denied registrations when the closed-account erasure fails', async () => {
    const { job, userRepository, personEraser, log, error } = setup({
      denied: ['id'],
      deleted: 1,
      closed: ['closed-id'],
    });
    personEraser.erase.mockRejectedValue(new Error('db down'));

    await expect(job.run()).resolves.toEqual({ deniedRegistrations: 1, closedAccounts: 0 });

    expect(userRepository.eraseClosed).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Could not erase the closed account(s)', expect.any(String));
    expect(log.mock.calls.map((call) => call[0])).toEqual(['Erased 1 denied registration(s)']);
  });

  it('logs a thrown value that is not an Error and never throws', async () => {
    const { job, userRepository, error } = setup();
    userRepository.findDeniedBefore.mockRejectedValue('boom');
    userRepository.findClosedBefore.mockRejectedValue('bang');

    await expect(job.run()).resolves.toEqual({ deniedRegistrations: 0, closedAccounts: 0 });

    expect(error).toHaveBeenCalledWith('Could not erase the denied registration(s)', 'boom');
    expect(error).toHaveBeenCalledWith('Could not erase the closed account(s)', 'bang');
  });
});
