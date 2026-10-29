import type { Locale } from "@/i18n/locales";

export type MyHistoryState = "month" | "daySelected" | "emptyPeriod" | "loading" | "error";

export type MyHistoryScreenProps = {
  locale: Locale;
  state: MyHistoryState;
};
