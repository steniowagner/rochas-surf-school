import type { Locale } from "@/i18n/locales";

export type EmailSignInState = "empty" | "invalid" | "sending" | "sendError";

export type EmailSignInScreenProps = {
  locale: Locale;
  state: EmailSignInState;
};
