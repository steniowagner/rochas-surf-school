import type { Locale } from "@/i18n/locales";

export type DateRangeSummaryProps = {
  locale: Locale;
  /** The first day, as "14 set", or `null` before any day is picked. */
  from: string | null;
  /** The last day, or `null` while a single day (or nothing) is picked. */
  to: string | null;
  /** The days taken out of the range, with their labels. */
  excluded: { date: string; label: string }[];
};
