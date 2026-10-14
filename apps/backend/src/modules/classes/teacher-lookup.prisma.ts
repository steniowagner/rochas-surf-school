import { Injectable } from '@nestjs/common';
import { TeacherLookup, TeacherRef } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaTeacherLookup implements TeacherLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findTeachers(ids: string[]): Promise<TeacherRef[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true, status: true },
    });
  }
}
