import { Injectable } from '@nestjs/common';
import {
  PushTicket,
  PushTicketRepository,
} from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaPushTicketRepository implements PushTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(tickets: PushTicket[]): Promise<void> {
    await this.prisma.pushTicket.createMany({
      data: tickets.map((ticket) => ({
        id: ticket.id,
        token: ticket.token,
        createdAt: ticket.createdAt,
      })),
      skipDuplicates: true,
    });
  }

  async findCreatedBefore(date: Date): Promise<PushTicket[]> {
    const records = await this.prisma.pushTicket.findMany({
      where: { createdAt: { lte: date } },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(({ id, token, createdAt }) => ({ id, token, createdAt }));
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await this.prisma.pushTicket.deleteMany({ where: { id: { in: ids } } });
  }
}
