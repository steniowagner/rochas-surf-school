export type CalendarWeekDay = {
  date: string;
  weekday: string;
  number: number;
  selected: boolean;
  today: boolean;
  marked: boolean;
};

export type CalendarWeekRowProps = {
  days: CalendarWeekDay[];
};
