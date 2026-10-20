import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { Enrolment } from '@rochas-surf-school/enrolment';
import type { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { EnrolmentExpiryJob } from './enrolment-expiry.job.js';
import type { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-19T11:30:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');
const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

function setup(findExpirable?: () => Promise<unknown[]>) {
  const enrolment = new Enrolment({
    classId: CLASS_ID,
    studentId: STUDENT_ID,
    status: 'pending',
    requestedAt: new Date('2026-10-18T12:00:00.000Z'),
  });
  const repository = {
    findExpirable: vi.fn(findExpirable ?? (async () => [{ enrolment, discipline: 'surf', startsAt: STARTS_AT }])),
    expire: vi.fn().mockResolvedValue(true),
  };
  const notifier = { requestExpired: vi.fn().mockResolvedValue(undefined) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new EnrolmentExpiryJob(
    repository as unknown as PrismaEnrolmentRepository,
    notifier as unknown as NotificationsEnrolmentNotifier,
    { now: () => NOW } as SystemClockProvider,
  );

  return { job, enrolment, repository, notifier, log, error };
}

describe('EnrolmentExpiryJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute, waiting for the previous run', () => {
    const handler = Object.getOwnPropertyDescriptor(EnrolmentExpiryJob.prototype, 'run')!.value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
      name: 'enrolment-expiry',
      waitForCompletion: true,
    });
  });

  it('expires the requests, pushes the students and logs only the count', async () => {
    const { job, enrolment, repository, notifier, log } = setup();

    await expect(job.run()).resolves.toEqual({ expired: 1 });

    expect(repository.findExpirable).toHaveBeenCalledWith(NOW);
    expect(repository.expire).toHaveBeenCalledWith(enrolment.id, NOW);
    expect(notifier.requestExpired).toHaveBeenCalledWith({
      studentId: STUDENT_ID,
      classId: CLASS_ID,
      discipline: 'surf',
      startsAt: STARTS_AT,
    });
    expect(log).toHaveBeenCalledWith('Enrolment expiry: 1 expired');
    expect(JSON.stringify(log.mock.calls)).not.toContain(STUDENT_ID);
  });

  it('pushes nothing for a request that was no longer pending', async () => {
    const { job, repository, notifier, log } = setup();
    repository.expire.mockResolvedValue(false);

    await expect(job.run()).resolves.toEqual({ expired: 0 });

    expect(notifier.requestExpired).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('catches and logs an error without throwing', async () => {
    const { job, error } = setup(async () => {
      throw new Error('db down');
    });

    await expect(job.run()).resolves.toEqual({ expired: 0 });

    expect(error).toHaveBeenCalledWith('Could not expire the pending enrolments', expect.stringContaining('db down'));
  });

  it('logs a thrown non-error as text', async () => {
    const { job, error } = setup(() => Promise.reject('plain text'));

    await job.run();

    expect(error).toHaveBeenCalledWith('Could not expire the pending enrolments', 'plain text');
  });
});
