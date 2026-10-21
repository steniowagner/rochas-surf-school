import { Injectable } from '@nestjs/common';
import type { ClassGuest, ClassRoster, ClassRosterReader, ClassStudent } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaClassRosterReader implements ClassRosterReader {
  constructor(private readonly prisma: PrismaService) {}

  async findRosters(classIds: string[], studentsLimit?: number): Promise<Map<string, ClassRoster>> {
    const rosters = new Map<string, ClassRoster>();

    if (classIds.length === 0) {
      return rosters;
    }

    // One read of the approved enrolments, in the order the students were approved, and one of the guests.
    const [records, guestRecords] = await Promise.all([
      this.prisma.enrolment.findMany({
        where: { classId: { in: classIds }, status: 'approved' },
        select: {
          id: true,
          classId: true,
          student: { select: { id: true, name: true, photoUrl: true } },
        },
        orderBy: [{ decidedAt: { sort: 'asc', nulls: 'last' } }, { studentId: 'asc' }],
      }),
      this.prisma.guest.findMany({
        where: { classId: { in: classIds } },
        select: { id: true, classId: true, name: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const students = new Map<string, ClassStudent[]>();

    for (const record of records) {
      students.set(record.classId, [
        ...(students.get(record.classId) ?? []),
        { ...record.student, enrolmentId: record.id },
      ]);
    }

    const guests = new Map<string, ClassGuest[]>();

    for (const { classId, ...guest } of guestRecords) {
      guests.set(classId, [...(guests.get(classId) ?? []), guest]);
    }

    for (const classId of new Set([...students.keys(), ...guests.keys()])) {
      const all = students.get(classId) ?? [];
      const classGuests = guests.get(classId) ?? [];

      rosters.set(classId, {
        seatsTaken: all.length + classGuests.length,
        students: all.slice(0, studentsLimit),
        guests: classGuests,
      });
    }

    return rosters;
  }
}
