export type CalendarWeekRowProps = {
  /** The seven days of the week, `YYYY-MM-DD`, Monday first. */
  days: string[];
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

export type CalendarWeekRowDay = {
  date: string;
  /** "WED". */
  weekday: string;
  number: number;
  selected: boolean;
  today: boolean;
  marked: boolean;
  accessibilityLabel: string;
};
