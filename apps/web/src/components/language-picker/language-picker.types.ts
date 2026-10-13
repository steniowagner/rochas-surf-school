import type { Locale } from "@/i18n/locales";

export type LanguagePickerProps = {
  locale: Locale;
  /** The accessible name of the picker, e.g. "Language". */
  label: string;
};

export type LanguageOption = {
  locale: Locale;
  href: string;
};

export type UseLanguagePickerProps = {
  locale: Locale;
};
