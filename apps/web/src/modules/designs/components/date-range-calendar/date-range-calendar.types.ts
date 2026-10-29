import type { Locale } from "@/i18n/locales";

import type { CalendarDayProps } from "../calendar-day/calendar-day.types";
import type { DateRangeSummaryProps } from "../date-range-summary/date-range-summary.types";

export type DateRangeCalendarProps = {
  locale: Locale;
  /** "Setembro 2026". */
  monthLabel: string;
  /** The weekdays' initials, Monday first. */
  initials: string[];
  /** The month's weeks, Monday first; `null` is a day before the current month, left blank. */
  weeks: (CalendarDayProps | null)[][];
  /** The previous month can be opened only after the current one. */
  canGoPrevious: boolean;
  /** What the calendar holds, under the grid; left out when a single day is picked (the edit form's). */
  summary?: Omit<DateRangeSummaryProps, "locale">;
};
