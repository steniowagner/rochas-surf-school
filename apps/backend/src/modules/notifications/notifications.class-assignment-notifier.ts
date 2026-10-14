import { Injectable, Logger } from '@nestjs/common';
import type {
  ClassAssigned,
  ClassAssignmentNotifier,
} from '@rochas-surf-school/classes';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `classes`' ClassAssignmentNotifier port. The batch is already stored when it runs, so notifying
 * never changes the answer: every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsClassAssignmentNotifier implements ClassAssignmentNotifier {
  private readonly logger = new Logger(NotificationsClassAssignmentNotifier.name);
  private readonly notify: Notify;

  constructor(
    notificationRepository: PrismaNotificationRepository,
    pushTokenRepository: PrismaPushTokenRepository,
    pushTicketRepository: PrismaPushTicketRepository,
    pushProvider: ExpoPushProvider,
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

  async classAssigned({ instructorIds, count, discipline }: ClassAssigned): Promise<void> {
    try {
      await this.notify.execute({
        userIds: instructorIds,
        type: 'class.assigned',
        params: { count, discipline },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify class.assigned to ${instructorIds.length} instructor(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
