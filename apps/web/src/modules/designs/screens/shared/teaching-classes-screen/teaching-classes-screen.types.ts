import type { Locale } from "@/i18n/locales";

export type TeachingClassesState = "list" | "nothingOngoing" | "filtered" | "empty" | "emptyFiltered" | "loading" | "error";

export type TeachingClassesScreenProps = {
  locale: Locale;
  state: TeachingClassesState;
};
