import { Injectable, Logger } from '@nestjs/common';
import { ReactivationNotifier } from '@rochas-surf-school/auth';
import { Notify, NotifyApprovedAdmins } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s ReactivationNotifier port. Notifying never changes the answer of the request that caused
 * it: the decision or the request is already committed, so every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsReactivationNotifier implements ReactivationNotifier {
  private readonly logger = new Logger(NotificationsReactivationNotifier.name);
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

  reactivationRequested(account: { id: string; name: string }): Promise<void> {
    return this.safely(`reactivation.requested for ${account.id}`, () =>
      new NotifyApprovedAdmins(this.recipientsProvider, this.notify).execute({
        name: account.name,
        userId: account.id,
        type: 'reactivation.requested',
      }),
    );
  }

  reactivationApproved(userId: string): Promise<void> {
    return this.safely(`reactivation.approved for ${userId}`, () =>
      this.notify.execute({
        userIds: [userId],
        type: 'reactivation.approved',
        params: {},
      }),
    );
  }

  reactivationDenied(userId: string, reason?: string): Promise<void> {
    return this.safely(`reactivation.denied for ${userId}`, () =>
      this.notify.execute({
        userIds: [userId],
        type: 'reactivation.denied',
        params: reason ? { reason } : {},
      }),
    );
  }

  private async safely(what: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(
        `Could not notify ${what}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
