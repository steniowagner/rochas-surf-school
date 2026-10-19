import { Injectable } from '@nestjs/common';
import type { ClassRoster, ClassRosterReader, ClassStudent } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaClassRosterReader implements ClassRosterReader {
  constructor(private readonly prisma: PrismaService) {}

  async findRosters(classIds: string[], studentsLimit?: number): Promise<Map<string, ClassRoster>> {
    const rosters = new Map<string, ClassRoster>();

    if (classIds.length === 0) {
      return rosters;
    }

    // One read of the approved enrolments, in the order the students were approved; guests join in a later spec.
    const records = await this.prisma.enrolment.findMany({
      where: { classId: { in: classIds }, status: 'approved' },
      select: {
        classId: true,
        student: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: [{ decidedAt: { sort: 'asc', nulls: 'last' } }, { studentId: 'asc' }],
    });

    const students = new Map<string, ClassStudent[]>();

    for (const record of records) {
      students.set(record.classId, [...(students.get(record.classId) ?? []), record.student]);
    }

    for (const [classId, all] of students) {
      rosters.set(classId, { seatsTaken: all.length, students: all.slice(0, studentsLimit) });
    }

    return rosters;
  }
}
