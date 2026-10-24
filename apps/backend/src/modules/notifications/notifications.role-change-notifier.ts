import { Injectable, Logger } from '@nestjs/common';
import { RoleChangedEvent, RoleChangeNotifier } from '@rochas-surf-school/auth';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s RoleChangeNotifier port: one `role.changed` to the person. Notifying never changes the
 * answer of the role change, which is already committed, so every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsRoleChangeNotifier implements RoleChangeNotifier {
  private readonly logger = new Logger(NotificationsRoleChangeNotifier.name);
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

  async roleChanged(event: RoleChangedEvent): Promise<void> {
    try {
      await this.notify.execute({
        userIds: [event.userId],
        type: 'role.changed',
        params: {
          role: event.role,
          seatsReleased: event.seatsReleased,
          classesReleased: event.classesReleased,
        },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify role.changed for ${event.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
