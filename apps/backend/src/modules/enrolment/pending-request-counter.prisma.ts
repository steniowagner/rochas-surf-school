import { Injectable } from '@nestjs/common';
import type { PendingRequestCounter } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaPendingRequestCounter implements PendingRequestCounter {
  constructor(private readonly prisma: PrismaService) {}

  countPendingRequests(classId: string): Promise<number> {
    return this.prisma.enrolment.count({ where: { classId, status: 'pending' } });
  }
}
