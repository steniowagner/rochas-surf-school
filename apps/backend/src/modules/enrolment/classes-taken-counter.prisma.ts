import { Injectable } from '@nestjs/common';
import type { ClassesTakenCounter } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaClassesTakenCounter implements ClassesTakenCounter {
  constructor(private readonly prisma: PrismaService) {}

  async countTaken(userIds: string[], now: Date): Promise<Record<string, number>> {
    const taken: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, 0]));
    if (userIds.length === 0) {
      return taken;
    }

    // The rule of `PrismaMyClassesReader.findHistoryClassIds`, for every student at once and with no date range: the
    // latest enrolment per student and class (newest `requested_at`, then `id`) is the approved one, in a class that
    // ended and wasn't cancelled.
    const rows = await this.prisma.$queryRaw<{ student_id: string; taken: number }[]>`
      SELECT latest.student_id, COUNT(*)::int AS taken
      FROM (
        SELECT DISTINCT ON (e.student_id, e.class_id) e.student_id, e.class_id, e.status
        FROM enrolments e
        WHERE e.student_id = ANY(${userIds}::uuid[])
        ORDER BY e.student_id, e.class_id, e.requested_at DESC, e.id DESC
      ) latest
      JOIN classes c ON c.id = latest.class_id
      WHERE latest.status = 'approved' AND c.cancelled_at IS NULL AND c.ends_at <= ${now}
      GROUP BY latest.student_id`;

    for (const row of rows) {
      taken[row.student_id] = row.taken;
    }

    return taken;
  }
}
