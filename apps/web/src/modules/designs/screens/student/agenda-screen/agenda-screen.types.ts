import type { Locale } from "@/i18n/locales";

export type AgendaState = "week" | "month" | "filterOpen" | "filtered" | "loading" | "empty" | "error";

export type AgendaScreenProps = {
  locale: Locale;
  state: AgendaState;
};
