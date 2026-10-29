import type { Locale } from "@/i18n/locales";

export type CreateAccountState = "empty" | "invalid" | "sending" | "sendError";

export type CreateAccountScreenProps = {
  locale: Locale;
  state: CreateAccountState;
};
