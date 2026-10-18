import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, NoInstructorNotifier, SchoolClassRepository } from "../provider";

export interface ReleaseUpcomingClassesIn {
  userId: string;
}

export interface ReleaseUpcomingClassesOut {
  released: number;
  withoutInstructor: number;
}

/**
 * Takes a person off every class of theirs that hasn't started and isn't cancelled (an account event, so no
 * actor), then tells the approved admins once about the classes left with nobody. Started, finished and
 * cancelled classes keep the person.
 */
export class ReleaseUpcomingClasses
  implements UseCase<ReleaseUpcomingClassesIn, ReleaseUpcomingClassesOut>
{
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly noInstructorNotifier: NoInstructorNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: ReleaseUpcomingClassesIn): Promise<ReleaseUpcomingClassesOut> {
    const upcoming = await this.schoolClassRepository.findUpcomingTaughtBy(
      input.userId,
      this.clockProvider.now(),
    );

    if (upcoming.length === 0) return { released: 0, withoutInstructor: 0 };

    await this.schoolClassRepository.removeInstructor(
      input.userId,
      upcoming.map((item) => item.id),
    );

    // Sorted by start then id, so the first is the earliest.
    const withoutInstructor = upcoming.filter((item) => item.instructorIds.length === 1);
    const [earliest] = withoutInstructor;

    if (earliest) {
      try {
        await this.noInstructorNotifier.classesWithoutInstructor({
          count: withoutInstructor.length,
          classId: earliest.id,
          discipline: earliest.discipline,
          startsAt: earliest.startsAt,
          excludeUserIds: [input.userId],
        });
      } catch {
        // A failed notification never changes the answer; the adapter logs it.
      }
    }

    return { released: upcoming.length, withoutInstructor: withoutInstructor.length };
  }
}
