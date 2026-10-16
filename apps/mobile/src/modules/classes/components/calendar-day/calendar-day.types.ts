export type CalendarDayProps = {
  /** `YYYY-MM-DD`. */
  date: string;
  disabled: boolean;
  /** A day of the previous or the next month, shown to complete the weeks of the visible one. */
  adjacentMonth: boolean;
  today: boolean;
  /** The first or last day of the range (a single day is both). */
  edge: boolean;
  /** A day under the range band: from the first to the last day, when they are two different days. */
  inRange: boolean;
  /** The band starts here (the first day, or the first of a week), so its left end is rounded. */
  bandStart: boolean;
  /** The band ends here (the last day, or the last of a week), so its right end is rounded. */
  bandEnd: boolean;
  /** Inside the range but taken out of it: no class is created on this day. */
  excluded: boolean;
  accessibilityLabel: string;
  onPress: (date: string) => void;
};
