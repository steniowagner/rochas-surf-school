import { Injectable } from '@nestjs/common';
import { PersonNotificationEraser } from '@rochas-surf-school/auth';
import { DeleteNotificationsAbout } from '@rochas-surf-school/notifications';
import { PrismaNotificationRepository } from './notification.prisma.js';

/** The adapter of `auth`'s PersonNotificationEraser port. */
@Injectable()
export class NotificationsPersonNotificationEraser implements PersonNotificationEraser {
  constructor(private readonly notificationRepository: PrismaNotificationRepository) {}

  erase(userIds: string[]): Promise<void> {
    return new DeleteNotificationsAbout(this.notificationRepository).execute({ userIds });
  }
}
