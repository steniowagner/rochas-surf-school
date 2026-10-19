import { Injectable } from '@nestjs/common';
import type { ClassEnrolmentsCloser } from '@rochas-surf-school/classes';
import { CloseClassEnrolments } from '@rochas-surf-school/enrolment';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/** The adapter of `classes`' ClassEnrolmentsCloser port: runs the enrolment module's use case. */
@Injectable()
export class EnrolmentClassEnrolmentsCloser implements ClassEnrolmentsCloser {
  constructor(
    private readonly enrolmentRepository: PrismaEnrolmentRepository,
    private readonly clock: SystemClockProvider,
  ) {}

  async closeOpenEnrolments(classId: string): Promise<string[]> {
    const { studentIds } = await new CloseClassEnrolments(this.enrolmentRepository, this.clock).execute({
      classId,
    });

    return studentIds;
  }
}
