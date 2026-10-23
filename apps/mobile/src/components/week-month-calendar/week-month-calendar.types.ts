export type CalendarView = "week" | "month";

export type VisibleRange = {
  /** The first day drawn, `YYYY-MM-DD`. */
  from: string;
  /** The last day drawn, `YYYY-MM-DD`. */
  to: string;
};

export type CalendarPeriod = {
  /** The Monday of the week, or the 1st of the month, `YYYY-MM-DD`. */
  from: string;
  /** The Sunday of the week, or the last day of the month, `YYYY-MM-DD`. */
  to: string;
};

export type WeekMonthCalendarProps = {
  /** The selected day, `YYYY-MM-DD`; `null` (no day selected) only with `clearable`. */
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
  /** Called on mount and whenever the first or last day drawn changes. */
  onVisibleRangeChange?: (range: VisibleRange) => void;
  /** The view it opens on; the week by default. */
  initialView?: CalendarView;
  /**
   * The selection may be empty, and the calendar keeps the week or month on screen itself: the arrows move that period
   * and clear the selection, pressing the selected day clears it, and switching view opens the selected day's week or
   * month (without one, today's week when today is in the month, else the week of its 1st; or the month of the week's
   * Monday). Without it, everything is drawn around `selectedDate` and the arrows select ±7 days or ±1 month.
   */
  clearable?: boolean;
  /** With `clearable`: asked to clear the selection. */
  onClearSelection?: () => void;
  /** Called on mount and whenever the week or month on screen changes, never with the faded days of the month grid. */
  onPeriodChange?: (period: CalendarPeriod) => void;
};

export type UseWeekMonthCalendarProps = Pick<
  WeekMonthCalendarProps,
  | "selectedDate"
  | "today"
  | "onSelectDate"
  | "onVisibleRangeChange"
  | "initialView"
  | "clearable"
  | "onClearSelection"
  | "onPeriodChange"
>;
