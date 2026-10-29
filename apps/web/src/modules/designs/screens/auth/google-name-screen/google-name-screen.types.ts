import type { Locale } from "@/i18n/locales";

export type GoogleNameState = "empty" | "invalid" | "sending" | "error";

export type GoogleNameScreenProps = {
  locale: Locale;
  state: GoogleNameState;
};
