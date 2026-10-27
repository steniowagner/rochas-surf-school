import { Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationPage,
  NotificationParams,
  NotificationRepository,
  NotificationType,
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

  async deleteRegistrationPending(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    await this.prisma.notification.deleteMany({
      where: {
        type: 'registration.pending',
        OR: userIds.map((userId) => ({
          params: { path: ['userId'], equals: userId },
        })),
      },
    });
  }

  /** One `deleteMany` per param that names the person: `userId`, then `studentId`. */
  async deleteAbout(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    await this.prisma.notification.deleteMany({
      where: {
        type: { in: ['registration.pending', 'reactivation.requested'] },
        OR: userIds.map((userId) => ({ params: { path: ['userId'], equals: userId } })),
      },
    });
    await this.prisma.notification.deleteMany({
      where: {
        type: { in: ['enrolment.requested', 'enrolment.cancelled'] },
        OR: userIds.map((userId) => ({ params: { path: ['studentId'], equals: userId } })),
      },
    });
  }

  async findPage(userId: string, page: number, perPage: number): Promise<NotificationPage> {
    const [records, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: records.map(
        (record) =>
          new Notification({
            id: record.id,
            userId: record.userId,
            type: record.type as NotificationType,
            params: record.params as NotificationParams,
            createdAt: record.createdAt,
            readAt: record.readAt,
          }),
      ),
      total,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: at },
    });
    if (count > 0) return true;

    // Nothing changed: either it was already read, or the user has no notification with that id.
    return (await this.prisma.notification.count({ where: { id, userId } })) > 0;
  }

  async markAllRead(userId: string, at: Date): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: at },
    });
  }
}
