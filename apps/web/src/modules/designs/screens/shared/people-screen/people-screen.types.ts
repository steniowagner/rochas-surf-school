import type { Locale } from "@/i18n/locales";

export type PeopleState = "list" | "filtered" | "empty" | "loading" | "error" | "sheet" | "sheetNotShared" | "whatsappUnavailable";

export type PeopleScreenProps = {
  locale: Locale;
  state: PeopleState;
};
