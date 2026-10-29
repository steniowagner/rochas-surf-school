import type { Locale } from "@/i18n/locales";

export type DeniedScreenProps = {
  locale: Locale;
  /** The admin's reason: text typed by the school, not app copy. Without it the note card is left out. */
  reason?: string;
  /** The school has a WhatsApp number, so the contact button is drawn. */
  hasSchoolNumber?: boolean;
};
