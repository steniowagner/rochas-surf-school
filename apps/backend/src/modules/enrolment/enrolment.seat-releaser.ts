import { Injectable } from '@nestjs/common';
import type { SeatReleaser } from '@rochas-surf-school/auth';
import { ReleaseStudentEnrolments } from '@rochas-surf-school/enrolment';
import { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s SeatReleaser port: an account deletion or a student's promotion gives up the person's
 * upcoming seats and pending requests, answering how many. Write errors propagate, so the account event fails as a
 * whole and can be retried (releasing is idempotent).
 */
@Injectable()
export class EnrolmentSeatReleaser implements SeatReleaser {
  constructor(
    private readonly enrolmentRepository: PrismaEnrolmentRepository,
    private readonly classReader: PrismaEnrolmentClassReader,
    private readonly studentNameReader: PrismaStudentNameReader,
    private readonly enrolmentNotifier: NotificationsEnrolmentNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  async releaseSeats(userId: string): Promise<number> {
    const { cancelled, withdrawn } = await new ReleaseStudentEnrolments(
      this.enrolmentRepository,
      this.classReader,
      this.studentNameReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ studentId: userId });

    return cancelled + withdrawn;
  }
}
