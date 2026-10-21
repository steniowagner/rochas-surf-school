import { Injectable } from '@nestjs/common';
import type { SeatCounter } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaSeatCounter implements SeatCounter {
  constructor(private readonly prisma: PrismaService) {}

  /** The approved enrolments of the class plus its guests. */
  async countSeatsTaken(classId: string): Promise<number> {
    const [students, guests] = await Promise.all([
      this.prisma.enrolment.count({ where: { classId, status: 'approved' } }),
      this.prisma.guest.count({ where: { classId } }),
    ]);

    return students + guests;
  }
}
