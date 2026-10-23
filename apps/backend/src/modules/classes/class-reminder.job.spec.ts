import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SchoolClass } from '@rochas-surf-school/classes';
import type { PrismaClassRosterReader } from '../enrolment/class-roster-reader.prisma.js';
import type { NotificationsClassReminderNotifier } from '../notifications/notifications.class-reminder-notifier.js';
import { ClassReminderJob } from './class-reminder.job.js';
import type { PrismaLocationRepository } from './location.prisma.js';
import type { PrismaSchoolClassRepository } from './school-class.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-15T10:30:00.000Z'); // 07:30 in Fortaleza
const STARTS_AT = new Date('2026-10-15T11:00:00.000Z');
const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const LOCATION_ID = 'c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65';

function setup(findDueForReminder?: () => Promise<SchoolClass[]>) {
  const schoolClass = new SchoolClass({
    discipline: 'surf',
    level: 'beginner',
    startsAt: STARTS_AT,
    endsAt: new Date('2026-10-15T12:00:00.000Z'),
    locationId: LOCATION_ID,
    instructorIds: [INSTRUCTOR_ID],
    capacity: 8,
    createdBy: ADMIN_ID,
  });
  const repository = {
    findDueForReminder: vi.fn(findDueForReminder ?? (async () => [schoolClass])),
    markReminded: vi.fn().mockResolvedValue(true),
  };
  const rosters = {
    findRosters: vi.fn().mockResolvedValue(
      new Map([
        [
          schoolClass.id,
          {
            seatsTaken: 1,
            students: [{ id: STUDENT_ID, name: 'Ana', photoUrl: null, enrolmentId: 'e-1' }],
            guests: [],
          },
        ],
      ]),
    ),
  };
  const locations = { findById: vi.fn().mockResolvedValue({ name: 'Praia do Futuro' }) };
  const notifier = { classReminder: vi.fn().mockResolvedValue(undefined) };
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const job = new ClassReminderJob(
    repository as unknown as PrismaSchoolClassRepository,
    rosters as unknown as PrismaClassRosterReader,
    locations as unknown as PrismaLocationRepository,
    notifier as unknown as NotificationsClassReminderNotifier,
    { now: () => NOW } as SystemClockProvider,
  );

  return { job, schoolClass, repository, notifier, log, error };
}

describe('ClassReminderJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute, waiting for the previous run', () => {
    const handler = Object.getOwnPropertyDescriptor(ClassReminderJob.prototype, 'run')!.value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
      name: 'class-reminder',
      waitForCompletion: true,
    });
  });

  it('reminds the students and instructors, marks the class and logs only the count', async () => {
    const { job, schoolClass, repository, notifier, log } = setup();

    await expect(job.run()).resolves.toEqual({ reminded: 1 });

    expect(repository.findDueForReminder).toHaveBeenCalledWith(NOW, 30);
    expect(repository.markReminded).toHaveBeenCalledWith(schoolClass.id, NOW);
    expect(notifier.classReminder).toHaveBeenCalledWith({
      recipientIds: [STUDENT_ID, INSTRUCTOR_ID],
      classId: schoolClass.id,
      discipline: 'surf',
      startsAt: STARTS_AT,
      locationName: 'Praia do Futuro',
    });
    expect(log).toHaveBeenCalledWith('Class reminders: 1 reminded');
    expect(JSON.stringify(log.mock.calls)).not.toContain(STUDENT_ID);
    expect(JSON.stringify(log.mock.calls)).not.toContain(schoolClass.id);
  });

  it('tells nobody and logs nothing for a class already reminded', async () => {
    const { job, repository, notifier, log } = setup();
    repository.markReminded.mockResolvedValue(false);

    await expect(job.run()).resolves.toEqual({ reminded: 0 });

    expect(notifier.classReminder).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('keeps the class reminded when the notifier fails', async () => {
    const { job, notifier } = setup();
    notifier.classReminder.mockRejectedValue(new Error('push down'));

    await expect(job.run()).resolves.toEqual({ reminded: 1 });
  });

  it('catches and logs an error without throwing', async () => {
    const { job, error } = setup(async () => {
      throw new Error('db down');
    });

    await expect(job.run()).resolves.toEqual({ reminded: 0 });

    expect(error).toHaveBeenCalledWith('Could not send the class reminders', expect.stringContaining('db down'));
  });

  it('logs a thrown non-error as text', async () => {
    const { job, error } = setup(() => Promise.reject('plain text'));

    await job.run();

    expect(error).toHaveBeenCalledWith('Could not send the class reminders', 'plain text');
  });
});
