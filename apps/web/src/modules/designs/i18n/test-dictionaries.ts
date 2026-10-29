import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/locales";

/** The site dictionaries by locale, for the tests of the design sections. */
export const dictionaries: Record<Locale, () => ReturnType<typeof getDictionary>> = {
  "pt-br": () => getDictionary("pt-br"),
  es: () => getDictionary("es"),
  en: () => getDictionary("en"),
};
