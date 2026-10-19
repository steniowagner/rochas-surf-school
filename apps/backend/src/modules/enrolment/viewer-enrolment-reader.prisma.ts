import { Injectable } from '@nestjs/common';
import type { ViewerEnrolment, ViewerEnrolmentReader } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaViewerEnrolmentReader implements ViewerEnrolmentReader {
  constructor(private readonly prisma: PrismaService) {}

  async findLatest(viewerId: string, classIds: string[]): Promise<Map<string, ViewerEnrolment>> {
    const latest = new Map<string, ViewerEnrolment>();

    if (classIds.length === 0) {
      return latest;
    }

    const records = await this.prisma.enrolment.findMany({
      where: { studentId: viewerId, classId: { in: classIds } },
      select: { id: true, classId: true, status: true, requestedAt: true },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    });

    for (const { classId, ...enrolment } of records) {
      // Newest first: the first row of each class is its latest enrolment.
      if (!latest.has(classId)) {
        latest.set(classId, enrolment);
      }
    }

    return latest;
  }
}
