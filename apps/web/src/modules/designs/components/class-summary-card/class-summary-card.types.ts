import type { Locale } from "@/i18n/locales";

export type ClassSummary = {
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** "Quarta-feira · 9 set". */
  dateLabel: string;
  /** "08:00 – 09:30". */
  timeRange: string;
  locationName: string;
};

export type ClassSummaryCardProps = ClassSummary & {
  locale: Locale;
  /** Drops the card's own border, background and padding, to sit inside another card. */
  embedded?: boolean;
};
