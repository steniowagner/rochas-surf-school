import { Injectable } from '@nestjs/common';
import type { MyClassesReader } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaMyClassesReader implements MyClassesReader {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentClassIds(studentId: string, now: Date): Promise<string[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: { endsAt: { gt: now }, enrolments: { some: { studentId } } },
      select: { id: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });

    return records.map((record) => record.id);
  }

  async findHistoryClassIds(studentId: string, now: Date, from: Date, to: Date): Promise<string[]> {
    // The student's latest enrolment per class (newest `requested_at`, then `id`) must be the approved one:
    // a seat held when the class ended.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM classes c
      JOIN (
        SELECT DISTINCT ON (e.class_id) e.class_id, e.status
        FROM enrolments e
        WHERE e.student_id = ${studentId}::uuid
        ORDER BY e.class_id, e.requested_at DESC, e.id DESC
      ) latest ON latest.class_id = c.id
      WHERE latest.status = 'approved' AND c.cancelled_at IS NULL AND c.ends_at <= ${now}
        AND c.starts_at >= ${from} AND c.starts_at < ${to}
      ORDER BY c.starts_at DESC, c.id DESC`;

    return rows.map((row) => row.id);
  }
}
