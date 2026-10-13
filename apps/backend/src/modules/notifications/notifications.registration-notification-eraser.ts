import { Injectable } from '@nestjs/common';
import { RegistrationNotificationEraser } from '@rochas-surf-school/auth';
import { DeleteRegistrationNotifications } from '@rochas-surf-school/notifications';
import { PrismaNotificationRepository } from './notification.prisma.js';

/** The adapter of `auth`'s RegistrationNotificationEraser port. */
@Injectable()
export class NotificationsRegistrationNotificationEraser implements RegistrationNotificationEraser {
  constructor(private readonly notificationRepository: PrismaNotificationRepository) {}

  erase(userIds: string[]): Promise<void> {
    return new DeleteRegistrationNotifications(this.notificationRepository).execute({ userIds });
  }
}
