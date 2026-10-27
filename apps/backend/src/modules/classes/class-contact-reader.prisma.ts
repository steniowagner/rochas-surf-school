import { Injectable } from '@nestjs/common';
import type { UserStatus } from '@rochas-surf-school/auth';
import { ClassContact, ClassContactReader } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaClassContactReader implements ClassContactReader {
  constructor(private readonly prisma: PrismaService) {}

  async findContacts(userIds: string[]): Promise<Map<string, ClassContact>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const users = await this.prisma.user.findMany({
      // An erased person (spec 067) has no contact: left out, like a missing one.
      where: { id: { in: userIds }, status: { not: 'erased' } },
      select: { id: true, role: true, status: true, whatsappNumber: true, whatsappVisible: true },
    });

    return new Map(users.map((user) => [user.id, { ...user, status: user.status as UserStatus }]));
  }
}
