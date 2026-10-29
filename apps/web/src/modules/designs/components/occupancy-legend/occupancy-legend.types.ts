import type { Locale } from "@/i18n/locales";

export type OccupancyLegendProps = {
  locale: Locale;
};

export type OccupancyLegendItem = {
  /** The swatch's background class. */
  swatch: string;
  /** The message key, under `weeklyOccupancy.legend`. */
  key: "low" | "mid" | "high" | "full";
};
