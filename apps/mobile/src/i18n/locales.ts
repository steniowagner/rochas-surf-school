import { getLocales } from "expo-localization";

export const supportedLocales = ["en-US", "es-ES", "pt-BR"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en-US";

// Keyed by ISO 639 language code, so every regional variant of a language maps to the same app locale
// (pt-PT and pt-AO use pt-BR, es-MX and es-AR use es-ES, en-GB and en-AU use en-US).
const localeByLanguage: Record<string, AppLocale> = {
  en: "en-US",
  es: "es-ES",
  pt: "pt-BR",
};

/** Names are written in each language, so they never change with the current locale. */
export const localeNames: Record<AppLocale, string> = {
  "en-US": "English",
  "es-ES": "Español",
  "pt-BR": "Português",
};

export const localeAcronyms: Record<AppLocale, string> = {
  "en-US": "EN",
  "es-ES": "ES",
  "pt-BR": "PT",
};

export const localeFlags: Record<AppLocale, string> = {
  "en-US": "🇺🇸",
  "es-ES": "🇪🇸",
  "pt-BR": "🇧🇷",
};

export function resolveAppLocale(
  languageCode: string | null | undefined,
): AppLocale {
  return (
    (languageCode && localeByLanguage[languageCode.toLowerCase()]) ||
    defaultLocale
  );
}

/** The app locale for the language the OS is set to, falling back to English (US). */
export function getDeviceLocale(): AppLocale {
  return resolveAppLocale(getLocales()[0]?.languageCode);
}
