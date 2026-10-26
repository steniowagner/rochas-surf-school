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
  /** Appended to the accessibility label of a marked day. */
  markedLabel?: string;
  /** The Monday of a week whose row gets a background, `YYYY-MM-DD`. */
  selectedWeekStart?: string;
  /**
   * Where a day's dot sits: `overlap` tucks it into the bottom of the day's slot (it overlaps a selected day's circle),
   * `below` keeps it under the circle. Defaults to `overlap`.
   */
  dotPlacement?: "overlap" | "below";
  onSelectDate: (date: string) => void;
};

export type UseCalendarMonthGridProps = Pick<
  CalendarMonthGridProps,
  | "month"
  | "selectedDate"
  | "today"
  | "markedDates"
  | "markedLabel"
  | "selectedWeekStart"
>;

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
