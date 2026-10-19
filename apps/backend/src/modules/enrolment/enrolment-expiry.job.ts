import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpirePendingEnrolments, ExpirePendingEnrolmentsOut } from '@rochas-surf-school/enrolment';
import { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * Every minute, expires the pending requests of the classes that started and tells their students. Idempotent: a
 * request is written only while it is still pending, and only a row that changed is pushed. Never throws, and logs only
 * the count, never the students or the classes.
 */
@Injectable()
export class EnrolmentExpiryJob {
  private readonly logger = new Logger(EnrolmentExpiryJob.name);

  constructor(
    private readonly enrolmentRepository: PrismaEnrolmentRepository,
    private readonly enrolmentNotifier: NotificationsEnrolmentNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'enrolment-expiry', waitForCompletion: true })
  async run(): Promise<ExpirePendingEnrolmentsOut> {
    try {
      const result = await new ExpirePendingEnrolments(
        this.enrolmentRepository,
        this.enrolmentNotifier,
        this.clock,
      ).execute();
      if (result.expired > 0) {
        this.logger.log(`Enrolment expiry: ${result.expired} expired`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Could not expire the pending enrolments',
        error instanceof Error ? error.stack : String(error),
      );
      return { expired: 0 };
    }
  }
}
