import { Injectable } from '@nestjs/common';
import { TeachingReleaser } from '@rochas-surf-school/auth';
import { ReleaseUpcomingClasses } from '@rochas-surf-school/classes';
import { NotificationsNoInstructorNotifier } from '../notifications/notifications.no-instructor-notifier.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * The adapter of `auth`'s TeachingReleaser port: an account event (a deletion, or a demotion by `actorId`) takes the
 * person off their upcoming classes, answering how many. Errors propagate, so the account event fails as a whole and
 * can be retried (releasing is idempotent).
 */
@Injectable()
export class ClassesTeachingReleaser implements TeachingReleaser {
  constructor(
    private readonly schoolClassRepository: PrismaSchoolClassRepository,
    private readonly noInstructorNotifier: NotificationsNoInstructorNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  async releaseUpcomingClasses(userId: string, actorId?: string): Promise<number> {
    const { released } = await new ReleaseUpcomingClasses(
      this.schoolClassRepository,
      this.noInstructorNotifier,
      this.clock,
    ).execute({ userId, actorId });

    return released;
  }
}
