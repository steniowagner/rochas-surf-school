import type { Locale } from "@/i18n/locales";

export type LocationSearchHeaderProps = {
  locale: Locale;
  /** What was typed; the placeholder without it. */
  text?: string;
};
