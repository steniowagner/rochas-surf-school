import type { Locale } from "@/i18n/locales";

export type RequestSeatClassCardProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** "qua" */
  weekday: string;
  /** "9 set" */
  date: string;
  /** "1 h 30 min" */
  duration: string;
  timeRange: string;
  locationName: string;
};
