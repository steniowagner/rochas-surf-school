import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

export type AdminAppClassProps = {
  locale: Locale;
  text: Dictionary["adminApp"];
};
