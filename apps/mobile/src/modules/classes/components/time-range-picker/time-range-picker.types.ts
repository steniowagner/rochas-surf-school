import type { TimeRange } from "@rochas-surf-school/classes";

export type TimeRangePickerProps = {
  /** The ranges of last week's classes. */
  suggestions: TimeRange[];
  /** The ranges added on the spot for this batch. */
  added: TimeRange[];
  selected: TimeRange[];
  /** Minutes after midnight now in America/Fortaleza when today is among the dates, else `null`. */
  nowMinutes: number | null;
  /** Called with the pressed range; in `single` mode only for a range that isn't the selected one. */
  onToggle: (range: TimeRange) => void;
  onAddPress: () => void;
  /** One range is chosen: pressing a chip selects only it and pressing the selected one keeps it. */
  single?: boolean;
  /**
   * `single` mode on today's date: a range starting at or before `nowMinutes` can't be picked, except `ownRange`
   * (the range of the class being edited, while that class hasn't started).
   */
  ownRange?: TimeRange | null;
};

export type UseTimeRangePickerProps = Pick<
  TimeRangePickerProps,
  "suggestions" | "added" | "selected" | "nowMinutes" | "single" | "ownRange" | "onToggle"
>;
