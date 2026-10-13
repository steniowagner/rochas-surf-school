import { Injectable, Logger } from '@nestjs/common';
import { RegistrationNotifier } from '@rochas-surf-school/auth';
import { Notify, NotifyApprovedAdmins } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s RegistrationNotifier port. Notifying never changes the answer of the request that caused
 * it: the decision or the account is already committed, so every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsRegistrationNotifier implements RegistrationNotifier {
  private readonly logger = new Logger(NotificationsRegistrationNotifier.name);
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

  registrationPending(account: { id: string; name: string }): Promise<void> {
    return this.safely(`registration.pending for ${account.id}`, () =>
      new NotifyApprovedAdmins(this.recipientsProvider, this.notify).execute({
        name: account.name,
      }),
    );
  }

  registrationApproved(userId: string): Promise<void> {
    return this.safely(`registration.approved for ${userId}`, () =>
      this.notify.execute({
        userIds: [userId],
        type: 'registration.approved',
        params: {},
      }),
    );
  }

  registrationDenied(userId: string, reason?: string): Promise<void> {
    return this.safely(`registration.denied for ${userId}`, () =>
      this.notify.execute({
        userIds: [userId],
        type: 'registration.denied',
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
