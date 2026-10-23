import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendClassReminders, SendClassRemindersOut } from '@rochas-surf-school/classes';
import { PrismaClassRosterReader } from '../enrolment/class-roster-reader.prisma.js';
import { NotificationsClassReminderNotifier } from '../notifications/notifications.class-reminder-notifier.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * Every minute, reminds the people of the classes starting within 30 minutes. Idempotent: a class is marked with a
 * conditional write, and only the run whose write changed the row notifies. Never throws, and logs only the count,
 * never the people or the classes.
 */
@Injectable()
export class ClassReminderJob {
  private readonly logger = new Logger(ClassReminderJob.name);

  constructor(
    private readonly schoolClassRepository: PrismaSchoolClassRepository,
    private readonly classRosterReader: PrismaClassRosterReader,
    private readonly locationRepository: PrismaLocationRepository,
    private readonly classReminderNotifier: NotificationsClassReminderNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'class-reminder', waitForCompletion: true })
  async run(): Promise<SendClassRemindersOut> {
    try {
      const result = await new SendClassReminders(
        this.schoolClassRepository,
        this.classRosterReader,
        this.locationRepository,
        this.classReminderNotifier,
        this.clock,
      ).execute();
      if (result.reminded > 0) {
        this.logger.log(`Class reminders: ${result.reminded} reminded`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Could not send the class reminders',
        error instanceof Error ? error.stack : String(error),
      );
      return { reminded: 0 };
    }
  }
}
