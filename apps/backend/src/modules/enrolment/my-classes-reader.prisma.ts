import { Injectable } from '@nestjs/common';
import type { MyClassesReader, MyClassHistoryPage } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

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

  async findHistoryClassIds(
    studentId: string,
    now: Date,
    page: number,
    perPage: number,
  ): Promise<MyClassHistoryPage> {
    // The student's latest enrolment per class (newest `requested_at`, then `id`) must be the approved one:
    // a seat held when the class ended.
    const from = Prisma.sql`
      FROM classes c
      JOIN (
        SELECT DISTINCT ON (e.class_id) e.class_id, e.status
        FROM enrolments e
        WHERE e.student_id = ${studentId}::uuid
        ORDER BY e.class_id, e.requested_at DESC, e.id DESC
      ) latest ON latest.class_id = c.id
      WHERE latest.status = 'approved' AND c.cancelled_at IS NULL AND c.ends_at <= ${now}`;

    const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT c.id ${from} ORDER BY c.starts_at DESC, c.id DESC
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total ${from}`,
    ]);

    return { ids: rows.map((row) => row.id), total: Number(counts[0].total) };
  }
}
