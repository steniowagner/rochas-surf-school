import { Injectable } from '@nestjs/common';
import type { UserStatus } from '@rochas-surf-school/auth';
import {
  ClassMessage,
  ClassMessageRepository,
  ClassMessageSender,
  ClassMessageView,
} from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

const SELECT = {
  id: true,
  title: true,
  message: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      photoUrl: true,
      role: true,
      status: true,
      whatsappNumber: true,
      whatsappVisible: true,
    },
  },
} satisfies Prisma.ClassMessageSelect;

type SenderRecord = Prisma.ClassMessageGetPayload<{ select: typeof SELECT }>['sender'];

@Injectable()
export class PrismaClassMessageRepository implements ClassMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(message: ClassMessage): Promise<ClassMessage> {
    await this.prisma.classMessage.create({
      data: {
        id: message.id,
        classId: message.classId,
        senderId: message.senderId,
        title: message.title,
        message: message.message,
        createdAt: message.createdAt,
      },
    });
    return message;
  }

  async findByClass(classId: string): Promise<ClassMessageView[]> {
    const records = await this.prisma.classMessage.findMany({
      where: { classId },
      select: SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return records.map(({ sender, ...record }) => ({ ...record, sender: this.toSender(sender) }));
  }

  /** An erased person (spec 067) keeps their row, without their data: the message answers no sender. */
  private toSender(record: SenderRecord): ClassMessageSender | null {
    if (record.status === 'erased') return null;

    return { ...record, name: record.name as string, status: record.status as UserStatus };
  }
}
