import { Injectable } from '@nestjs/common';
import type { TeachingClassesReader } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaTeachingClassesReader implements TeachingClassesReader {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentClassIds(teacherId: string, now: Date): Promise<string[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: { endsAt: { gt: now }, instructors: { some: { userId: teacherId } } },
      select: { id: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });

    return records.map((record) => record.id);
  }

  async findHistoryClassIds(teacherId: string, now: Date, from: Date, to: Date): Promise<string[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: {
        endsAt: { lte: now },
        cancelledAt: null,
        startsAt: { gte: from, lt: to },
        instructors: { some: { userId: teacherId } },
      },
      select: { id: true },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
    });

    return records.map((record) => record.id);
  }

  async teachesAny(teacherId: string): Promise<boolean> {
    const record = await this.prisma.classInstructor.findFirst({
      where: { userId: teacherId },
      select: { classId: true },
    });

    return record !== null;
  }
}
