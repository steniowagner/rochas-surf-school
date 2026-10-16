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

export const sortTimeRanges = (ranges: TimeRange[]): TimeRange[] =>
  [...ranges].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  );

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

  return sortTimeRanges(merged);
};

/** A range that starts at or before `nowMinutes` has no class left today. */
export const startsByNow = (range: TimeRange, nowMinutes: number): boolean =>
  parseTimeOfDay(range.start)! <= nowMinutes;

/** A range that can't be picked: it overlaps one already selected. */
export const isRangeBlocked = (range: TimeRange, selected: TimeRange[]): boolean =>
  selected.some((item) => !isSameRange(item, range) && timeRangesOverlap(item, range));

export const rangeLabel = (range: TimeRange): string => `${range.start} – ${range.end}`;

export const toHHmm = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/** The range of two picked times, and whether its end is after its start. */
export const rangeOf = (
  start: Date,
  end: Date,
): { range: TimeRange; valid: boolean } => {
  const range = { start: toHHmm(start), end: toHHmm(end) };

  return {
    range,
    valid: timeRangeEndsAfterStart(range),
  };
};
