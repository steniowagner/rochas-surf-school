import type { Locale } from "@/i18n/locales";

export type OccupancyStatsProps = {
  locale: Locale;
  /** The week's figures over its classes that weren't cancelled. */
  stats: { percent: number; taken: number; total: number; free: number; fullClasses: number };
};
