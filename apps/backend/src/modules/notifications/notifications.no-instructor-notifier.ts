import { Injectable, Logger } from '@nestjs/common';
import type { ClassesWithoutInstructor, NoInstructorNotifier } from '@rochas-surf-school/classes';
import { Notify, NotifyClassesWithoutInstructor } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `classes`' NoInstructorNotifier port. The classes are already released when it runs, so notifying
 * never changes the answer: every error is logged and swallowed, and nothing retries.
 */
@Injectable()
export class NotificationsNoInstructorNotifier implements NoInstructorNotifier {
  private readonly logger = new Logger(NotificationsNoInstructorNotifier.name);
  private readonly notifyClassesWithoutInstructor: NotifyClassesWithoutInstructor;

  constructor(
    notificationRepository: PrismaNotificationRepository,
    pushTokenRepository: PrismaPushTokenRepository,
    pushTicketRepository: PrismaPushTicketRepository,
    pushProvider: ExpoPushProvider,
    recipientsProvider: PrismaRecipientsProvider,
    clock: SystemClockProvider,
  ) {
    this.notifyClassesWithoutInstructor = new NotifyClassesWithoutInstructor(
      recipientsProvider,
      new Notify(notificationRepository, pushTokenRepository, pushTicketRepository, pushProvider, clock),
    );
  }

  async classesWithoutInstructor(event: ClassesWithoutInstructor): Promise<void> {
    try {
      await this.notifyClassesWithoutInstructor.execute(event);
    } catch (error) {
      this.logger.error(
        `Could not notify class.noInstructor for ${event.classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
