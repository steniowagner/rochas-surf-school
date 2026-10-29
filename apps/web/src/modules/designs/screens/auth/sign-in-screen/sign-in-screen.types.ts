import type { Locale } from "@/i18n/locales";

export type SignInScreenProps = {
  locale: Locale;
  /** The language sheet is open over the screen. */
  languageSheetOpen?: boolean;
  /** The Google button shows its spinner. */
  googleLoading?: boolean;
  /** The app message key of the toast on top of the screen. */
  toastKey?: string;
};
