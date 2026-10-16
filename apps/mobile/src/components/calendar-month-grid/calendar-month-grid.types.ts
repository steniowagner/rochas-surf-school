import type { CalendarMonth } from "@/utils/calendar-dates.types";

export type CalendarMonthGridProps = {
  /** The month to draw; the days of the months around it fill its first and last weeks. */
  month: CalendarMonth;
  /** The selected day, `YYYY-MM-DD`. */
  selectedDate: string;
  /** Today, `YYYY-MM-DD`. */
  today: string;
  /** The days that get a dot. */
  markedDates: string[];
  /** Appended to the accessibility label of a marked day. */
  markedLabel?: string;
  onSelectDate: (date: string) => void;
};

export type CalendarMonthGridDay = {
  date: string;
  number: number;
  selected: boolean;
  today: boolean;
  /** A day of the month before or after the drawn one. */
  adjacent: boolean;
  marked: boolean;
  accessibilityLabel: string;
};
