import { DateRange } from "../../utils/calendar";

export type DateRangeCalendarProps = {
  /** Today in America/Fortaleza, `YYYY-MM-DD`: earlier days can't be chosen. */
  today: string;
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
  /** Days of the range that are left out. */
  excludedDates: string[];
  onRangeChange: (range: DateRange) => void;
  /** Pressing a day selects only it: no range, no days taken out, and no summary under the grid. */
  single?: boolean;
};

export type UseDateRangeCalendarProps = DateRangeCalendarProps;
