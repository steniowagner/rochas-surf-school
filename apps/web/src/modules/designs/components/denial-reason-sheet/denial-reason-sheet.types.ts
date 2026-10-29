import type { Locale } from "@/i18n/locales";

export type DenialReasonSheetProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** "qua, 9 set às 08:00" */
  start: string;
  /** The school's reason, typed by the school; without one the sheet says there is none. */
  reason?: string;
};
