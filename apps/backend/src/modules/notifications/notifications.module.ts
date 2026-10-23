import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { ExpoPushProvider } from './expo.push.js';
import { NotificationsClassAssignmentNotifier } from './notifications.class-assignment-notifier.js';
import { NotificationsClassChangeNotifier } from './notifications.class-change-notifier.js';
import { NotificationsClassReminderNotifier } from './notifications.class-reminder-notifier.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsEnrolmentNotifier } from './notifications.enrolment-notifier.js';
import { NotificationsLocationChangeNotifier } from './notifications.location-change-notifier.js';
import { NotificationsNoInstructorNotifier } from './notifications.no-instructor-notifier.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsPushTokenRemover } from './notifications.push-token-remover.js';
import { NotificationsRegistrationNotificationEraser } from './notifications.registration-notification-eraser.js';
import { NotificationsRegistrationNotifier } from './notifications.registration-notifier.js';
import { PushReceiptCheckJob } from './push-receipt-check.job.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

@Module({
  imports: [DbModule],
  controllers: [NotificationsController],
  providers: [
    PrismaNotificationRepository,
    PrismaPushTokenRepository,
    PrismaPushTicketRepository,
    PrismaRecipientsProvider,
    SystemClockProvider,
    ExpoPushProvider,
    NotificationsRegistrationNotifier,
    NotificationsClassAssignmentNotifier,
    NotificationsClassChangeNotifier,
    NotificationsClassReminderNotifier,
    NotificationsEnrolmentNotifier,
    NotificationsLocationChangeNotifier,
    NotificationsNoInstructorNotifier,
    NotificationsPushTokenRemover,
    NotificationsRegistrationNotificationEraser,
    PushReceiptCheckJob,
  ],
  exports: [
    NotificationsRegistrationNotifier,
    NotificationsClassAssignmentNotifier,
    NotificationsClassChangeNotifier,
    NotificationsClassReminderNotifier,
    NotificationsEnrolmentNotifier,
    NotificationsLocationChangeNotifier,
    NotificationsNoInstructorNotifier,
    NotificationsPushTokenRemover,
    NotificationsRegistrationNotificationEraser,
  ],
})
export class NotificationsModule {}
