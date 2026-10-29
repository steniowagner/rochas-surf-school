import type { Locale } from "@/i18n/locales";

import type { CalendarMonthDay } from "../calendar-month-grid/calendar-month-grid.types";

export type WeekPickerSheetProps = {
  locale: Locale;
  /** "SETEMBRO 2026". */
  caption: string;
  initials: string[];
  /** The month's weeks, Monday first; the days with classes are marked. */
  weeks: CalendarMonthDay[][];
  /** The selected week, drawn as a band across its row. */
  selectedWeekIndex: number;
};
