import { DateRange } from "../../utils/calendar";

export type DateRangeCalendarProps = {
  /** Today in America/Fortaleza, `YYYY-MM-DD`: earlier days can't be chosen. */
  today: string;
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
  weekdays: number[];
  onRangeChange: (range: DateRange) => void;
  onWeekdaysChange: (weekdays: number[]) => void;
};

export type UseDateRangeCalendarProps = DateRangeCalendarProps;
