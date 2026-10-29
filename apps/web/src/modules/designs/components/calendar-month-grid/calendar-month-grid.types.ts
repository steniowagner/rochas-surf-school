export type CalendarMonthDay = {
  date: string;
  number: number;
  selected: boolean;
  today: boolean;
  marked: boolean;
  /** Belongs to the previous or next month. */
  adjacent: boolean;
};

export type CalendarMonthGridProps = {
  initials: string[];
  weeks: CalendarMonthDay[][];
  selectedWeekIndex: number;
};
