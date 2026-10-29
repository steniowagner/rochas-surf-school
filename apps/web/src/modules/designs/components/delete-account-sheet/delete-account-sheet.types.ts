import type { Locale } from "@/i18n/locales";

export type DeleteAccountSheetProps = {
  locale: Locale;
  /** The confirm button shows its spinner. */
  removing?: boolean;
};
