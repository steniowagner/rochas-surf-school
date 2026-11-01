import { Injectable } from '@nestjs/common';
import { MessageSender, MessageSenderReader } from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaMessageSenderReader implements MessageSenderReader {
  constructor(private readonly prisma: PrismaService) {}

  async findSenders(ids: string[]): Promise<Map<string, MessageSender>> {
    const users = await this.prisma.user.findMany({
      // An erased person (spec 067) can't be read: left out, like a missing one.
      where: { id: { in: ids }, status: { not: 'erased' } },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        role: true,
        status: true,
        whatsappNumber: true,
        whatsappVisible: true,
      },
    });

    return new Map(users.map((user) => [user.id, { ...user, name: user.name as string }]));
  }
}
