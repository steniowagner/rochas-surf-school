import { Injectable } from '@nestjs/common';
import type { ClassAudienceReader, LocationAudienceMember } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

/** The people who hold a seat (approved) or wait for an answer (pending) are the ones a class change reaches. */
const AUDIENCE_STATUSES = ['approved', 'pending'] as const;

@Injectable()
export class PrismaClassAudienceReader implements ClassAudienceReader {
  constructor(private readonly prisma: PrismaService) {}

  async findClassAudience(classId: string): Promise<string[]> {
    const records = await this.prisma.enrolment.findMany({
      where: { classId, status: { in: [...AUDIENCE_STATUSES] } },
      select: { studentId: true },
      distinct: ['studentId'],
      orderBy: { studentId: 'asc' },
    });

    return records.map((record) => record.studentId);
  }

  async findLocationAudience(locationId: string, now: Date): Promise<LocationAudienceMember[]> {
    const records = await this.prisma.enrolment.findMany({
      where: {
        status: { in: [...AUDIENCE_STATUSES] },
        schoolClass: { locationId, cancelledAt: null, startsAt: { gt: now } },
      },
      select: { studentId: true, classId: true },
      distinct: ['studentId', 'classId'],
      orderBy: { studentId: 'asc' },
    });

    const counts = new Map<string, number>();

    for (const { studentId } of records) {
      counts.set(studentId, (counts.get(studentId) ?? 0) + 1);
    }

    return [...counts].map(([userId, count]) => ({ userId, count }));
  }
}
