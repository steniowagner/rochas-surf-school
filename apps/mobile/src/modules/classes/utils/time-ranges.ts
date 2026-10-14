import {
  parseTimeOfDay,
  timeRangeEndsAfterStart,
  timeRangesOverlap,
  type TimeRange,
} from "@rochas-surf-school/classes";

export const isSameRange = (a: TimeRange, b: TimeRange): boolean =>
  a.start === b.start && a.end === b.end;

export const includesRange = (ranges: TimeRange[], range: TimeRange): boolean =>
  ranges.some((item) => isSameRange(item, range));

/** The suggestions and the ranges added on the spot, without repeats, by start and then end. */
export const mergeTimeRanges = (
  suggestions: TimeRange[],
  added: TimeRange[],
): TimeRange[] => {
  const merged: TimeRange[] = [];

  for (const range of [...suggestions, ...added]) {
    if (!includesRange(merged, range)) {
      merged.push(range);
    }
  }

  return merged.sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  );
};

/** A range that starts at or before `nowMinutes` can't be created for today. */
export const startsByNow = (range: TimeRange, nowMinutes: number): boolean =>
  parseTimeOfDay(range.start)! <= nowMinutes;

/**
 * A range that can't be picked: it overlaps one already selected, or today is among the dates and it has started.
 * `nowMinutes` is `null` when today isn't among the dates.
 */
export const isRangeBlocked = (
  range: TimeRange,
  selected: TimeRange[],
  nowMinutes: number | null,
): boolean =>
  selected.some((item) => !isSameRange(item, range) && timeRangesOverlap(item, range)) ||
  (nowMinutes !== null && startsByNow(range, nowMinutes));

export const rangeLabel = (range: TimeRange): string => `${range.start} – ${range.end}`;

export const toHHmm = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/** The range of two picked times, and whether its end is after its start. */
export const rangeOf = (
  start: Date,
  end: Date,
): { range: TimeRange; valid: boolean; minutes: number } => {
  const range = { start: toHHmm(start), end: toHHmm(end) };

  return {
    range,
    valid: timeRangeEndsAfterStart(range),
    minutes: parseTimeOfDay(range.end)! - parseTimeOfDay(range.start)!,
  };
};
