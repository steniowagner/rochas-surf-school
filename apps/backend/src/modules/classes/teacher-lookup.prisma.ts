import { Injectable } from '@nestjs/common';
import type { UserStatus } from '@rochas-surf-school/auth';
import { TeacherLookup, TeacherRef } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaTeacherLookup implements TeacherLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findTeachers(ids: string[]): Promise<TeacherRef[]> {
    const users = await this.prisma.user.findMany({
      // An erased account (spec 067) is left out, like one that doesn't exist.
      where: { id: { in: ids }, status: { not: 'erased' } },
      select: { id: true, role: true, status: true, isInstructor: true },
    });

    return users.map((user) => ({ ...user, status: user.status as UserStatus }));
  }
}
