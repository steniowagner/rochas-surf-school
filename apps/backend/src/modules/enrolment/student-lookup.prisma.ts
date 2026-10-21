import { Injectable } from '@nestjs/common';
import type { StudentLookup } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaStudentLookup implements StudentLookup {
  constructor(private readonly prisma: PrismaService) {}

  async isApprovedStudent(studentId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id: studentId, role: 'student', status: 'approved' },
    });

    return count === 1;
  }
}
