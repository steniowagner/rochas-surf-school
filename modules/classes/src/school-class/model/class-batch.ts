import { TZDate } from "@date-fns/tz";
import { CLASS_TIME_ZONE } from "./class-limits";
import { parseTimeOfDay, TimeRange } from "./time-range";

export interface ClassBatchDates {
  startDate: string;
  endDate: string;
  /** ISO weekdays: 1 (Monday) to 7 (Sunday). */
  weekdays: number[];
  /** `YYYY-MM-DD` dates of the range left out of the batch, even when their weekday is listed. */
  excludedDates?: string[];
}

export interface ClassBatchInput extends ClassBatchDates {
  timeRanges: TimeRange[];
}

export interface BatchClass {
  startsAt: Date;
  endsAt: Date;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Milliseconds (UTC midnight) of a real `YYYY-MM-DD` calendar date, or null. */
function parseDate(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? time
    : null;
}

export function isValidIsoDate(value: unknown): value is string {
  return parseDate(value) !== null;
}

/** Both dates are real and the end is not before the start. */
export function isValidDateRange(startDate: unknown, endDate: unknown): boolean {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  return start !== null && end !== null && end >= start;
}

export function isValidWeekdays(weekdays: unknown): weekdays is number[] {
  return (
    Array.isArray(weekdays) &&
    weekdays.length > 0 &&
    weekdays.every(
      (item) => Number.isInteger(item) && item >= 1 && item <= 7,
    )
  );
}

/** Absent (or null) when nothing is excluded; otherwise a list of real `YYYY-MM-DD` dates. */
export function isValidExcludedDates(
  excludedDates: unknown,
): excludedDates is string[] | undefined | null {
  return (
    excludedDates === undefined ||
    excludedDates === null ||
    (Array.isArray(excludedDates) && excludedDates.every(isValidIsoDate))
  );
}

/**
 * The dates of the range, inclusive, whose ISO weekday is listed and that are not excluded. With `max`,
 * stops after `max + 1` dates so a huge range never loops for long.
 */
export function listBatchDates(
  { startDate, endDate, weekdays, excludedDates }: ClassBatchDates,
  max = Number.POSITIVE_INFINITY,
): string[] {
  const start = parseDate(startDate)!;
  const end = parseDate(endDate)!;
  const excluded = new Set(excludedDates);
  const dates: string[] = [];

  for (let time = start; time <= end && dates.length <= max; time += DAY_MS) {
    const date = new Date(time);
    const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();

    const isoDate = date.toISOString().slice(0, 10);

    if (weekdays.includes(weekday) && !excluded.has(isoDate)) {
      dates.push(isoDate);
    }
  }

  return dates;
}

function toInstant(date: string, minutes: number): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const zoned = new TZDate(
    year,
    month - 1,
    day,
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    CLASS_TIME_ZONE,
  );

  return new Date(zoned.getTime());
}

/**
 * One class per included date and time range, as UTC instants of the
 * America/Fortaleza times, by date and then by start. With `max`, stops after
 * more than `max` classes. The input must already be valid.
 */
export function listBatchClasses(
  input: ClassBatchInput,
  max = Number.POSITIVE_INFINITY,
): BatchClass[] {
  const ranges = input.timeRanges
    .map((range) => ({
      start: parseTimeOfDay(range.start)!,
      end: parseTimeOfDay(range.end)!,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const classes: BatchClass[] = [];

  for (const date of listBatchDates(input, max)) {
    for (const range of ranges) {
      if (classes.length > max) return classes;

      classes.push({
        startsAt: toInstant(date, range.start),
        endsAt: toInstant(date, range.end),
      });
    }
  }

  return classes;
}
