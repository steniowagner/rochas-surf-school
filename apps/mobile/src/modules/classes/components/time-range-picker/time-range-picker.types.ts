import type { TimeRange } from "@rochas-surf-school/classes";

export type TimeRangePickerProps = {
  /** The ranges of last week's classes. */
  suggestions: TimeRange[];
  /** The ranges added on the spot for this batch. */
  added: TimeRange[];
  selected: TimeRange[];
  /** Minutes after midnight now in America/Fortaleza when today is among the dates, else `null`. */
  nowMinutes: number | null;
  onToggle: (range: TimeRange) => void;
  onAddPress: () => void;
};

export type UseTimeRangePickerProps = Pick<
  TimeRangePickerProps,
  "suggestions" | "added" | "selected" | "nowMinutes"
>;
