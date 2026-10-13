export const locales = ["pt-br", "es", "en"] as const;

export type Locale = (typeof locales)[number];

/** Used when the browser's language is missing or none of the three. */
export const defaultLocale: Locale = "pt-br";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Keyed by ISO 639 language code, so every regional variant of a language maps to the same locale
// (pt-PT uses pt-br, es-MX uses es, en-GB uses en), like the mobile app's resolveAppLocale.
const localeByLanguage: Record<string, Locale> = {
  pt: "pt-br",
  es: "es",
  en: "en",
};

/** The value of `<html lang>`. */
export const htmlLang: Record<Locale, string> = {
  "pt-br": "pt-BR",
  es: "es",
  en: "en",
};

/** Names are written in each language, so they never change with the current locale. */
export const localeNames: Record<Locale, string> = {
  "pt-br": "Português",
  es: "Español",
  en: "English",
};

export const localeAcronyms: Record<Locale, string> = {
  "pt-br": "PT",
  es: "ES",
  en: "EN",
};

export const localeFlags: Record<Locale, string> = {
  "pt-br": "🇧🇷",
  es: "🇪🇸",
  en: "🇺🇸",
};

/**
 * The locale of the first `Accept-Language` entry, in quality order, whose language is pt, es or en;
 * `defaultLocale` when none matches or the header is missing.
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const entries = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().split(";");
      const qParam = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const quality = qParam === undefined ? 1 : Number(qParam.slice(2));

      return { language: tag.split("-")[0].toLowerCase(), quality, index };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of entries) {
    const locale = localeByLanguage[language];

    if (locale) {
      return locale;
    }
  }

  return defaultLocale;
}
