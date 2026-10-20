import { Injectable } from '@nestjs/common';
import type { SeatCounter } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaSeatCounter implements SeatCounter {
  constructor(private readonly prisma: PrismaService) {}

  /** The approved enrolments of the class; guests join in a later spec. */
  countSeatsTaken(classId: string): Promise<number> {
    return this.prisma.enrolment.count({ where: { classId, status: 'approved' } });
  }
}
