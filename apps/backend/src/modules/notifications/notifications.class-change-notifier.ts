import { Injectable, Logger } from '@nestjs/common';
import type { ClassChangeNotifier, ClassEdited } from '@rochas-surf-school/classes';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `classes`' ClassChangeNotifier port. The change is already stored when it runs, so notifying never
 * changes the answer: every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsClassChangeNotifier implements ClassChangeNotifier {
  private readonly logger = new Logger(NotificationsClassChangeNotifier.name);
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

  async classEdited({ instructorIds, classId, discipline, startsAt }: ClassEdited): Promise<void> {
    try {
      await this.notify.execute({
        userIds: instructorIds,
        type: 'class.edited',
        params: { classId, discipline, startsAt: startsAt.toISOString() },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify class.edited to ${instructorIds.length} instructor(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
