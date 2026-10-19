import { Injectable } from '@nestjs/common';
import type { StudentNameReader } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaStudentNameReader implements StudentNameReader {
  constructor(private readonly prisma: PrismaService) {}

  async findName(studentId: string): Promise<string | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });

    return record?.name ?? null;
  }
}
