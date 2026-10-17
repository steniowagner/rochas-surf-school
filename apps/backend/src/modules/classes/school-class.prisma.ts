import { Injectable } from '@nestjs/common';
import { SchoolClass, SchoolClassRepository } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import type {
  ClassInstructor as ClassInstructorRecord,
  SchoolClass as SchoolClassRecord,
} from '../../generated/prisma/client.js';

type SchoolClassWithInstructors = SchoolClassRecord & {
  instructors: Pick<ClassInstructorRecord, 'userId'>[];
};

@Injectable()
export class PrismaSchoolClassRepository implements SchoolClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(classes: SchoolClass[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolClass.createMany({
        data: classes.map((item) => ({
          id: item.id,
          discipline: item.discipline,
          level: item.level,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          locationId: item.locationId,
          capacity: item.capacity,
          notes: item.notes,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
        })),
      });
      await tx.classInstructor.createMany({
        data: classes.flatMap((item) =>
          item.instructorIds.map((userId) => ({ classId: item.id, userId })),
        ),
      });
    });
  }

  async findStartingBetween(from: Date, to: Date): Promise<SchoolClass[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: { startsAt: { gte: from, lt: to } },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string): Promise<SchoolClass | null> {
    const record = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: { instructors: { select: { userId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async update(schoolClass: SchoolClass): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // The check sits on the write itself: an edit that read the class before a cancel writes nothing.
      const { count } = await tx.schoolClass.updateMany({
        where: { id: schoolClass.id, cancelledAt: null },
        data: {
          discipline: schoolClass.discipline,
          level: schoolClass.level,
          startsAt: schoolClass.startsAt,
          endsAt: schoolClass.endsAt,
          locationId: schoolClass.locationId,
          capacity: schoolClass.capacity,
          notes: schoolClass.notes,
          updatedAt: schoolClass.updatedAt,
        },
      });
      if (count === 0) {
        return false;
      }

      await tx.classInstructor.deleteMany({ where: { classId: schoolClass.id } });
      await tx.classInstructor.createMany({
        data: schoolClass.instructorIds.map((userId) => ({ classId: schoolClass.id, userId })),
      });

      return true;
    });
  }

  async cancel(id: string, at: Date, message: string | null): Promise<boolean> {
    const { count } = await this.prisma.schoolClass.updateMany({
      where: { id, cancelledAt: null },
      data: { cancelledAt: at, cancellationMessage: message },
    });

    return count === 1;
  }

  private toDomain(record: SchoolClassWithInstructors): SchoolClass {
    return new SchoolClass({
      id: record.id,
      discipline: record.discipline,
      level: record.level,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      locationId: record.locationId,
      instructorIds: record.instructors.map((item) => item.userId),
      capacity: record.capacity,
      notes: record.notes,
      cancelledAt: record.cancelledAt,
      cancellationMessage: record.cancellationMessage,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
