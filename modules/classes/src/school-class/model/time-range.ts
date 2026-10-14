export interface TimeRange {
  start: string;
  end: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight of an `HH:mm` (24 h) time, or null when malformed. */
export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const match = TIME_PATTERN.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function isValidTimeRange(range: unknown): range is TimeRange {
  if (typeof range !== "object" || range === null) return false;

  const { start, end } = range as Partial<TimeRange>;
  return parseTimeOfDay(start) !== null && parseTimeOfDay(end) !== null;
}

/** Both times must already be valid. */
export function timeRangeEndsAfterStart(range: TimeRange): boolean {
  return parseTimeOfDay(range.end)! > parseTimeOfDay(range.start)!;
}

/** Ranges that only touch (09:00 end, 09:00 start) don't overlap. */
export function timeRangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return (
    parseTimeOfDay(a.start)! < parseTimeOfDay(b.end)! &&
    parseTimeOfDay(b.start)! < parseTimeOfDay(a.end)!
  );
}

export function hasOverlappingTimeRanges(ranges: TimeRange[]): boolean {
  return ranges.some((range, index) =>
    ranges.slice(index + 1).some((other) => timeRangesOverlap(range, other)),
  );
}
