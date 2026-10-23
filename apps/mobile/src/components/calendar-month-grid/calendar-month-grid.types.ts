import type { CalendarMonth } from "@/utils/calendar-dates.types";

export type CalendarMonthGridProps = {
  /** The month to draw; the days of the months around it fill its first and last weeks. */
  month: CalendarMonth;
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

export type UseCalendarMonthGridProps = Pick<
  CalendarMonthGridProps,
  "month" | "selectedDate" | "today" | "markedDates" | "markedCounts" | "markedLabel"
>;

export type CalendarMonthGridDay = {
  date: string;
  number: number;
  selected: boolean;
  today: boolean;
  /** A day of the month before or after the drawn one. */
  adjacent: boolean;
  marked: boolean;
  /** How many dots the day shows: 0 to 3. */
  dots: number;
  accessibilityLabel: string;
};
