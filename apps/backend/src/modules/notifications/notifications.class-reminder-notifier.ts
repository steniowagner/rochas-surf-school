import { Injectable, Logger } from '@nestjs/common';
import type { ClassReminder, ClassReminderNotifier } from '@rochas-surf-school/classes';
import { Notify } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `classes`' ClassReminderNotifier port. The class is already marked as reminded when it runs, so
 * every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsClassReminderNotifier implements ClassReminderNotifier {
  private readonly logger = new Logger(NotificationsClassReminderNotifier.name);
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

  async classReminder({
    recipientIds,
    classId,
    discipline,
    startsAt,
    locationName,
  }: ClassReminder): Promise<void> {
    try {
      await this.notify.execute({
        userIds: recipientIds,
        type: 'class.reminder',
        params: { classId, discipline, startsAt: startsAt.toISOString(), locationName },
      });
    } catch (error) {
      this.logger.error(
        `Could not notify class.reminder to ${recipientIds.length} person(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
