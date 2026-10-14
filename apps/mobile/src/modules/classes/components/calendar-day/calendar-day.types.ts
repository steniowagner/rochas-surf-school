export type CalendarDayProps = {
  /** `YYYY-MM-DD`. */
  date: string;
  disabled: boolean;
  today: boolean;
  /** The first or last day of the range (a single day is both). */
  edge: boolean;
  /** A day inside the range, between its ends. */
  inRange: boolean;
  /** Inside the range but left out by the weekday filter. */
  excluded: boolean;
  accessibilityLabel: string;
  onPress: (date: string) => void;
};
