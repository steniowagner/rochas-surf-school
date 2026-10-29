import type { Locale } from "@/i18n/locales";

export type MyClassesState = "all" | "pending" | "confirmed" | "ended" | "sport" | "empty" | "emptyFilter" | "loading" | "error";

export type MyClassesScreenProps = {
  locale: Locale;
  state: MyClassesState;
};
