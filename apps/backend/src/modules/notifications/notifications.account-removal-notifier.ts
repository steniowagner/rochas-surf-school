import { Injectable, Logger } from '@nestjs/common';
import { AccountRemovalNotifier } from '@rochas-surf-school/auth';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s AccountRemovalNotifier port: one `account.removed` or `account.restored` to the person.
 * Notifying never changes the answer of the removal or the restore, which is already committed, so every error is
 * logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsAccountRemovalNotifier implements AccountRemovalNotifier {
  private readonly logger = new Logger(NotificationsAccountRemovalNotifier.name);
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

  accountRemoved(userId: string): Promise<void> {
    return this.send(userId, 'account.removed');
  }

  accountRestored(userId: string): Promise<void> {
    return this.send(userId, 'account.restored');
  }

  private async send(userId: string, type: 'account.removed' | 'account.restored'): Promise<void> {
    try {
      await this.notify.execute({ userIds: [userId], type, params: {} });
    } catch (error) {
      this.logger.error(
        `Could not notify ${type} for ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
