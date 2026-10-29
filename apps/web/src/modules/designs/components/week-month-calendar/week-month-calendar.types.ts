import type { CalendarMonthGridProps } from "../calendar-month-grid/calendar-month-grid.types";
import type { CalendarWeekRowProps } from "../calendar-week-row/calendar-week-row.types";

export type WeekMonthCalendarProps = {
  view: "week" | "month";
  /** The text of the pill: the month name, or the week's range. */
  caption: string;
  previousLabel: string;
  nextLabel: string;
  week: CalendarWeekRowProps;
  month: CalendarMonthGridProps;
};
