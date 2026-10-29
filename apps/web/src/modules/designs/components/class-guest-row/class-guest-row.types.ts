import type { Locale } from "@/i18n/locales";

export type ClassGuestRowProps = {
  locale: Locale;
  /** The guest's name, or `null` for who may not see it (only the "Trial" chip). */
  name: string | null;
};
