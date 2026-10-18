import { TZDate } from "@date-fns/tz";
import { CLASS_TIME_ZONE } from "./class-limits";
import { toInstant } from "./class-batch";
import { parseTimeOfDay } from "./time-range";

/** What the language model understood from a cancellation rule, before the backend turns it into an instant. */
export type CancellationDeadlineDescription =
  | { kind: "minutesBefore"; minutes: number }
  | { kind: "daysBeforeAt"; days: number; time: string }
  | { kind: "classStart" }
  | { kind: "unclear" };

export const CANCELLATION_MINUTES_MAX = 43200;
export const CANCELLATION_DAYS_MAX = 30;

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * The instant a class can be cancelled until, or null when the description is unusable (`unclear`, a missing
 * field or a value out of range). Never later than the start of the class.
 */
export function computeCancellationDeadline(
  description: CancellationDeadlineDescription,
  startsAt: Date,
): Date | null {
  const deadline = rawDeadline(description, startsAt);

  if (deadline === null) return null;

  return deadline.getTime() > startsAt.getTime() ? new Date(startsAt.getTime()) : deadline;
}

function rawDeadline(
  description: CancellationDeadlineDescription,
  startsAt: Date,
): Date | null {
  switch (description.kind) {
    case "classStart":
      return new Date(startsAt.getTime());
    case "minutesBefore":
      return isIntegerBetween(description.minutes, 0, CANCELLATION_MINUTES_MAX)
        ? new Date(startsAt.getTime() - description.minutes * 60_000)
        : null;
    case "daysBeforeAt": {
      const time = parseTimeOfDay(description.time);

      if (!isIntegerBetween(description.days, 0, CANCELLATION_DAYS_MAX) || time === null) {
        return null;
      }

      const start = new TZDate(startsAt.getTime(), CLASS_TIME_ZONE);
      const day = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate() - description.days));

      return toInstant(day.toISOString().slice(0, 10), time);
    }
    default:
      return null;
  }
}
