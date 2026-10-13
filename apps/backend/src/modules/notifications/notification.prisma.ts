import { Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationRepository,
} from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(notifications: Notification[]): Promise<void> {
    await this.prisma.notification.createMany({
      data: notifications.map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        params: notification.params as Prisma.InputJsonValue,
        createdAt: notification.createdAt,
      })),
    });
  }
}
