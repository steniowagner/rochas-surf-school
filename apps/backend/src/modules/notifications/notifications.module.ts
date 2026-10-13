import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { ExpoPushProvider } from './expo.push.js';
import { NotificationsController } from './notifications.controller.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsPushTokenRemover } from './notifications.push-token-remover.js';
import { NotificationsRegistrationNotifier } from './notifications.registration-notifier.js';
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
    NotificationsPushTokenRemover,
  ],
  exports: [NotificationsRegistrationNotifier, NotificationsPushTokenRemover],
})
export class NotificationsModule {}
