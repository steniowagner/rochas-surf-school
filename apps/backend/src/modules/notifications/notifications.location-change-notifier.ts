import { Injectable, Logger } from '@nestjs/common';
import type { LocationChanged, LocationChangeNotifier } from '@rochas-surf-school/classes';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `classes`' LocationChangeNotifier port. The edit is already stored when it runs, so notifying never
 * changes the answer: every error is logged and swallowed, and nothing retries. Each instructor gets their own
 * notification, because the count of their upcoming classes at the location differs.
 */
@Injectable()
export class NotificationsLocationChangeNotifier implements LocationChangeNotifier {
  private readonly logger = new Logger(NotificationsLocationChangeNotifier.name);
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

  async locationChanged({ recipients, locationName }: LocationChanged): Promise<void> {
    for (const { instructorId, count } of recipients) {
      try {
        await this.notify.execute({
          userIds: [instructorId],
          type: 'location.changed',
          params: { count, locationName },
        });
      } catch (error) {
        this.logger.error(
          'Could not notify location.changed to 1 instructor',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
