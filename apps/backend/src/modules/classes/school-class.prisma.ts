import { Injectable } from '@nestjs/common';
import {
  ClassDiscipline,
  SchoolClass,
  SchoolClassRepository,
  SchoolClassUpdateOptions,
} from '@rochas-surf-school/classes';
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

  async update(schoolClass: SchoolClass, options: SchoolClassUpdateOptions): Promise<boolean> {
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
          // The edit and the clearing are one write: a deadline never outlives the details it was worked out from.
          ...(options.clearDeadline
            ? {
                cancellationDeadline: null,
                deadlineAttempts: 0,
                deadlineNextAttemptAt: null,
                deadlineRevision: { increment: 1 },
              }
            : {}),
          // Never written from the entity: writing the read value back could undo a mark the job set meanwhile.
          ...(options.clearReminder ? { reminderSentAt: null } : {}),
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

  async delete(id: string, now: Date): Promise<boolean> {
    // The checks sit on the write itself; the class_instructors rows go with it (ON DELETE CASCADE).
    const { count } = await this.prisma.schoolClass.deleteMany({
      where: { id, cancelledAt: null, startsAt: { gt: now } },
    });

    return count === 1;
  }

  async findUpcomingTaughtBy(userId: string, now: Date): Promise<SchoolClass[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: {
        instructors: { some: { userId } },
        startsAt: { gt: now },
        cancelledAt: null,
      },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async removeInstructor(userId: string, classIds: string[]): Promise<void> {
    if (classIds.length === 0) {
      return;
    }

    // Only that person's rows: the classes and their other instructors stay.
    await this.prisma.$transaction(async (tx) => {
      await tx.classInstructor.deleteMany({ where: { userId, classId: { in: classIds } } });
    });
  }

  async findNeedingDeadline(query: {
    now: Date;
    disciplines: ClassDiscipline[];
    limit: number;
  }): Promise<SchoolClass[]> {
    const { now, disciplines, limit } = query;
    const due = {
      discipline: { in: disciplines },
      startsAt: { gt: now },
      cancelledAt: null,
      cancellationDeadline: null,
      OR: [{ deadlineNextAttemptAt: null }, { deadlineNextAttemptAt: { lte: now } }],
    };
    const find = (attempts: { equals: 0 } | { gt: 0 }, take: number) =>
      this.prisma.schoolClass.findMany({
        where: { ...due, deadlineAttempts: attempts },
        include: { instructors: { select: { userId: true } } },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take,
      });

    // The never-tried classes come first, so a few unreadable ones can't starve the new ones.
    const neverTried = await find({ equals: 0 }, limit);
    const retried = neverTried.length < limit ? await find({ gt: 0 }, limit - neverTried.length) : [];

    return [...neverTried, ...retried].map((record) => this.toDomain(record));
  }

  async saveDeadline(id: string, revision: number, deadline: Date): Promise<boolean> {
    // The revision sits on the write itself: an edit or a rule change during the call wins.
    const { count } = await this.prisma.schoolClass.updateMany({
      where: { id, deadlineRevision: revision, cancelledAt: null },
      data: { cancellationDeadline: deadline, deadlineAttempts: 0, deadlineNextAttemptAt: null },
    });

    return count === 1;
  }

  async recordDeadlineFailure(
    id: string,
    revision: number,
    attempts: number,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.schoolClass.updateMany({
      where: { id, deadlineRevision: revision, cancelledAt: null },
      data: { deadlineAttempts: attempts, deadlineNextAttemptAt: nextAttemptAt },
    });

    return count === 1;
  }

  async findDueForReminder(now: Date, leadMinutes: number): Promise<SchoolClass[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: {
        cancelledAt: null,
        reminderSentAt: null,
        startsAt: { gt: now, lte: new Date(now.getTime() + leadMinutes * 60_000) },
      },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async markReminded(id: string, at: Date): Promise<boolean> {
    // The checks sit on the write itself: of two runs at once, or a run racing a cancel, one write wins.
    const { count } = await this.prisma.schoolClass.updateMany({
      where: { id, reminderSentAt: null, cancelledAt: null },
      data: { reminderSentAt: at },
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
      cancellationDeadline: record.cancellationDeadline,
      deadlineRevision: record.deadlineRevision,
      deadlineAttempts: record.deadlineAttempts,
      deadlineNextAttemptAt: record.deadlineNextAttemptAt,
      reminderSentAt: record.reminderSentAt,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
