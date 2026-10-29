import type { Locale } from "@/i18n/locales";

export type WeeklyOccupancyState = "week" | "otherSelected" | "nextWeek" | "picker" | "loading" | "empty" | "error";

export type WeeklyOccupancyScreenProps = {
  locale: Locale;
  state: WeeklyOccupancyState;
};
