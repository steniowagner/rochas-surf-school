import type { Locale } from "@/i18n/locales";

export type MyClassesFilter = "all" | "pending" | "confirmed" | "ended";

export type MyClassesFiltersProps = {
  locale: Locale;
  selected: MyClassesFilter;
};
