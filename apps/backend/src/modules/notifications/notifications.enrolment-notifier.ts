import { Injectable, Logger } from '@nestjs/common';
import type {
  EnrolmentNotifier,
  RequestDecided,
  RequestDenied,
  RequestExpired,
  SeatCancelled,
  SeatRequested,
} from '@rochas-surf-school/enrolment';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `enrolment`'s EnrolmentNotifier port. The enrolment is already stored when it runs, so notifying
 * never changes the answer: every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsEnrolmentNotifier implements EnrolmentNotifier {
  private readonly logger = new Logger(NotificationsEnrolmentNotifier.name);
  private readonly notify: Notify;

  constructor(
    notificationRepository: PrismaNotificationRepository,
    pushTokenRepository: PrismaPushTokenRepository,
    pushTicketRepository: PrismaPushTicketRepository,
    pushProvider: ExpoPushProvider,
    private readonly recipientsProvider: PrismaRecipientsProvider,
    clock: SystemClockProvider,
  ) {
    this.notify = new Notify(
      notificationRepository,
      pushTokenRepository,
      pushTicketRepository,
      pushProvider,
      clock,
    );
  }

  async seatRequested({
    classId,
    studentName,
    discipline,
    startsAt,
    instructorIds,
  }: SeatRequested): Promise<void> {
    try {
      const adminIds = await this.recipientsProvider.findApprovedAdminIds();
      // An admin who teaches the class is told once.
      const userIds = [...new Set([...adminIds, ...instructorIds])];

      await this.notify.execute({
        userIds,
        type: 'enrolment.requested',
        params: { classId, studentName, discipline, startsAt: startsAt.toISOString() },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify enrolment.requested for ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async requestExpired({ studentId, classId, discipline, startsAt }: RequestExpired): Promise<void> {
    try {
      await this.notify.execute({
        userIds: [studentId],
        type: 'enrolment.expired',
        params: { classId, discipline, startsAt: startsAt.toISOString() },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify enrolment.expired for ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async requestApproved({ studentId, classId, discipline, startsAt }: RequestDecided): Promise<void> {
    try {
      await this.notify.execute({
        userIds: [studentId],
        type: 'enrolment.approved',
        params: { classId, discipline, startsAt: startsAt.toISOString() },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify enrolment.approved for ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async requestDenied({ studentId, classId, discipline, startsAt, reason }: RequestDenied): Promise<void> {
    try {
      await this.notify.execute({
        userIds: [studentId],
        type: 'enrolment.denied',
        params: { classId, discipline, startsAt: startsAt.toISOString(), ...(reason ? { reason } : {}) },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify enrolment.denied for ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async seatCancelled({
    classId,
    studentName,
    discipline,
    startsAt,
    waitingCount,
    instructorIds,
  }: SeatCancelled): Promise<void> {
    try {
      const adminIds = await this.recipientsProvider.findApprovedAdminIds();
      // An admin who teaches the class is told once.
      const userIds = [...new Set([...adminIds, ...instructorIds])];

      await this.notify.execute({
        userIds,
        type: 'enrolment.cancelled',
        params: { classId, studentName, discipline, startsAt: startsAt.toISOString(), waitingCount },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify enrolment.cancelled for ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
