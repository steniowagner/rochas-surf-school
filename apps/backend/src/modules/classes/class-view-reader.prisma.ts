import { Injectable } from '@nestjs/common';
import { ClassView, ClassViewReader } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

const INCLUDE = {
  location: { select: { id: true, name: true, address: true } },
  instructors: { select: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.SchoolClassInclude;

type ClassRecord = Prisma.SchoolClassGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class PrismaClassViewReader implements ClassViewReader {
  constructor(private readonly prisma: PrismaService) {}

  async findStartingBetween(from: Date, to: Date): Promise<ClassView[]> {
    const records = await this.prisma.schoolClass.findMany({
      where: { startsAt: { gte: from, lt: to } },
      include: INCLUDE,
      orderBy: [{ startsAt: 'asc' }, { endsAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toView(record));
  }

  async findById(id: string): Promise<ClassView | null> {
    const record = await this.prisma.schoolClass.findUnique({ where: { id }, include: INCLUDE });
    return record ? this.toView(record) : null;
  }

  private toView(record: ClassRecord): ClassView {
    return {
      id: record.id,
      discipline: record.discipline,
      level: record.level,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      capacity: record.capacity,
      notes: record.notes,
      location: record.location,
      instructors: record.instructors.map((item) => item.user),
    };
  }
}
