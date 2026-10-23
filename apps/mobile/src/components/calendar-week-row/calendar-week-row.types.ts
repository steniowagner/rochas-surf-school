export type CalendarWeekRowProps = {
  /** The seven days of the week, `YYYY-MM-DD`, Monday first. */
  days: string[];
  /** The selected day, `YYYY-MM-DD`, or `null` when no day is selected. */
  selectedDate: string | null;
  /** Today, `YYYY-MM-DD`. */
  today: string;
  /** The days that get a dot. */
  markedDates: string[];
  /** How many dots each marked day gets, up to 3; a marked day missing from it gets one. */
  markedCounts?: Record<string, number>;
  /** Appended to the accessibility label of a marked day. */
  markedLabel?: string;
  onSelectDate: (date: string) => void;
};

export type UseCalendarWeekRowProps = Pick<
  CalendarWeekRowProps,
  "days" | "selectedDate" | "today" | "markedDates" | "markedCounts" | "markedLabel"
>;

export type CalendarWeekRowDay = {
  date: string;
  /** "WED". */
  weekday: string;
  number: number;
  selected: boolean;
  today: boolean;
  marked: boolean;
  /** How many dots the day shows: 0 to 3. */
  dots: number;
  accessibilityLabel: string;
};
