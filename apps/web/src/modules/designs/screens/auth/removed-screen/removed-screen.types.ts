import type { Locale } from "@/i18n/locales";

export type RemovedScreenProps = {
  locale: Locale;
  /** The school has a WhatsApp number, so the contact button is drawn. */
  hasSchoolNumber?: boolean;
  /** The WhatsApp chat couldn't be opened: the toast is drawn. */
  contactError?: boolean;
};
