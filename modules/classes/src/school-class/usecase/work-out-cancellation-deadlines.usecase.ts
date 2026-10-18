import { TZDate } from "@date-fns/tz";
import { UseCase } from "@rochas-surf-school/shared";
import { CancellationRuleRepository } from "../../cancellation-rule";
import { LocationRepository } from "../../location";
import { CLASS_TIME_ZONE, SchoolClass, computeCancellationDeadline } from "../model";
import {
  CancellationDeadlineDescriber,
  CancellationDeadlineRequest,
  ClockProvider,
  SchoolClassRepository,
} from "../provider";

export const DEADLINE_CLASSES_PER_RUN = 20;
export const DEADLINE_CLASSES_AT_A_TIME = 5;
export const DEADLINE_BACKOFF_MAX_MINUTES = 60;

export interface WorkOutCancellationDeadlinesOut {
  workedOut: number;
  failed: number;
}

/** Minutes to wait after the n-th consecutive failed attempt: 1, 2, 4, 8, 16, 32, 60, 60… */
export function deadlineBackoffMinutes(attempts: number): number {
  return Math.min(2 ** (attempts - 1), DEADLINE_BACKOFF_MAX_MINUTES);
}

const pad = (value: number) => String(value).padStart(2, "0");

function toRequest(
  rule: string,
  schoolClass: SchoolClass,
  location: { name: string; address: string },
): CancellationDeadlineRequest {
  const start = new TZDate(schoolClass.startsAt.getTime(), CLASS_TIME_ZONE);
  const end = new TZDate(schoolClass.endsAt.getTime(), CLASS_TIME_ZONE);

  return {
    rule,
    class: {
      discipline: schoolClass.discipline,
      level: schoolClass.level,
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: CLASS_TIME_ZONE }).format(
        schoolClass.startsAt,
      ),
      start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      end: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      locationName: location.name,
      locationAddress: location.address,
      capacity: schoolClass.capacity,
      notes: schoolClass.notes,
    },
  };
}

/**
 * Works out the cancellation deadline of the upcoming classes that have none, through the language-model
 * port. Runs without an actor (a job). A class is stored only for the revision it was read at.
 */
export class WorkOutCancellationDeadlines
  implements UseCase<void, WorkOutCancellationDeadlinesOut>
{
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly cancellationRuleRepository: CancellationRuleRepository,
    private readonly locationRepository: LocationRepository,
    private readonly describer: CancellationDeadlineDescriber,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(): Promise<WorkOutCancellationDeadlinesOut> {
    const now = this.clockProvider.now();
    const rules = new Map(
      (await this.cancellationRuleRepository.findAll()).map((rule) => [rule.discipline, rule.text]),
    );
    const out: WorkOutCancellationDeadlinesOut = { workedOut: 0, failed: 0 };

    if (rules.size === 0) return out;

    const classes = await this.schoolClassRepository.findNeedingDeadline({
      now,
      disciplines: [...rules.keys()],
      limit: DEADLINE_CLASSES_PER_RUN,
    });

    for (let index = 0; index < classes.length; index += DEADLINE_CLASSES_AT_A_TIME) {
      const results = await Promise.all(
        classes
          .slice(index, index + DEADLINE_CLASSES_AT_A_TIME)
          .map((schoolClass) => this.workOut(schoolClass, rules.get(schoolClass.discipline)!, now)),
      );

      for (const result of results) {
        if (result === "workedOut") out.workedOut += 1;
        if (result === "failed") out.failed += 1;
      }
    }

    return out;
  }

  private async workOut(
    schoolClass: SchoolClass,
    rule: string,
    now: Date,
  ): Promise<"workedOut" | "failed" | "dropped"> {
    const deadline = await this.describe(schoolClass, rule);

    if (deadline !== null) {
      return (await this.schoolClassRepository.saveDeadline(
        schoolClass.id,
        schoolClass.deadlineRevision,
        deadline,
      ))
        ? "workedOut"
        : "dropped";
    }

    const attempts = schoolClass.deadlineAttempts + 1;
    const nextAttemptAt = new Date(now.getTime() + deadlineBackoffMinutes(attempts) * 60_000);

    return (await this.schoolClassRepository.recordDeadlineFailure(
      schoolClass.id,
      schoolClass.deadlineRevision,
      attempts,
      nextAttemptAt,
    ))
      ? "failed"
      : "dropped";
  }

  /** The deadline, or null when anything about the attempt fails. */
  private async describe(schoolClass: SchoolClass, rule: string): Promise<Date | null> {
    try {
      const location = await this.locationRepository.findById(schoolClass.locationId);

      if (!location) return null;

      const description = await this.describer.describe(toRequest(rule, schoolClass, location));

      return computeCancellationDeadline(description, schoolClass.startsAt);
    } catch {
      return null;
    }
  }
}
