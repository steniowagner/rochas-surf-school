export type CalendarView = "week" | "month";

export type VisibleRange = {
  /** The first day drawn, `YYYY-MM-DD`. */
  from: string;
  /** The last day drawn, `YYYY-MM-DD`. */
  to: string;
};

export type WeekMonthCalendarProps = {
  /** The selected day, `YYYY-MM-DD`. */
  selectedDate: string;
  /** Today, `YYYY-MM-DD`. */
  today: string;
  /** The days that get a dot. */
  markedDates: string[];
  /** Appended to the accessibility label of a marked day. */
  markedLabel?: string;
  onSelectDate: (date: string) => void;
  /** Called on mount and whenever the first or last day drawn changes. */
  onVisibleRangeChange?: (range: VisibleRange) => void;
};

export type UseWeekMonthCalendarProps = Pick<
  WeekMonthCalendarProps,
  "selectedDate" | "onSelectDate" | "onVisibleRangeChange"
>;
