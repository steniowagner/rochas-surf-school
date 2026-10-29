import type { Locale } from "@/i18n/locales";

export type ClassHistoryState = "month" | "daySelected" | "emptyPeriod" | "loading" | "error";

export type ClassHistoryScreenProps = {
  locale: Locale;
  state: ClassHistoryState;
  /** The student's history (`myHistory` copy), or the instructor's (`teachingHistory` copy, with the intro on top). */
  role?: "student" | "instructor";
};
