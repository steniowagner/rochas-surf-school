import type { Locale } from "@/i18n/locales";

export type OccupancyWeekBarProps = {
  locale: Locale;
  /** "ESTA SEMANA", "PRÓXIMA SEMANA", "HÁ 2 SEMANAS"… */
  relativeLabel: string;
  /** The label is the current week's, the only one in the sun color. */
  isCurrentWeek: boolean;
  /** "7 – 13 SET". */
  caption: string;
};
