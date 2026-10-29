import type { Locale } from "@/i18n/locales";

export type GuestsWarningProps = {
  locale: Locale;
  /** How many trial guests the class has; the note is left out when there are none. */
  count: number;
};
