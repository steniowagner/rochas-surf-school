import type { Locale } from "@/i18n/locales";

export type TimeRangeSheetProps = {
  locale: Locale;
  /** The hours and minutes on the start wheels; the sheet opens at 12:00. */
  start?: { hour: number; minute: number };
  /** The end wheels; the sheet opens at 13:00. */
  end?: { hour: number; minute: number };
};
