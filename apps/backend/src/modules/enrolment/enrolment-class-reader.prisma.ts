import { Injectable } from '@nestjs/common';
import type { EnrolmentClass, EnrolmentClassReader } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaEnrolmentClassReader implements EnrolmentClassReader {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EnrolmentClass | null> {
    const record = await this.prisma.schoolClass.findUnique({
      where: { id },
      select: {
        id: true,
        discipline: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        cancelledAt: true,
        instructors: { select: { userId: true } },
      },
    });

    if (!record) {
      return null;
    }

    const rule = await this.prisma.cancellationRule.findUnique({
      where: { discipline: record.discipline },
      select: { discipline: true },
    });

    return {
      id: record.id,
      discipline: record.discipline,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      capacity: record.capacity,
      cancelledAt: record.cancelledAt,
      instructorIds: record.instructors.map((item) => item.userId),
      hasCancellationRule: rule !== null,
    };
  }
}
