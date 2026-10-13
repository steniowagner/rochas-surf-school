import { Injectable } from '@nestjs/common';
import {
  PushLocale,
  PushToken,
  PushTokenRepository,
} from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';
import type { PushToken as PushTokenRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaPushTokenRepository implements PushTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(pushToken: PushToken): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: pushToken.token },
      create: {
        token: pushToken.token,
        userId: pushToken.userId,
        locale: pushToken.locale,
        createdAt: pushToken.createdAt,
        updatedAt: pushToken.updatedAt,
      },
      update: {
        userId: pushToken.userId,
        locale: pushToken.locale,
        updatedAt: pushToken.updatedAt,
      },
    });
  }

  async findByUserIds(userIds: string[]): Promise<PushToken[]> {
    const records = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      orderBy: [{ createdAt: 'asc' }, { token: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token } });
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
  }

  async deleteForUser(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  private toDomain(record: PushTokenRecord): PushToken {
    return new PushToken({
      token: record.token,
      userId: record.userId,
      locale: record.locale as PushLocale,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
