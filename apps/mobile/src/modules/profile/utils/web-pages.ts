import type { AppLocale } from "@/i18n/locales";

export type WebPage = "privacy-policy" | "terms-of-use";

// The web app's `lang` segment for each app language.
const webLanguages: Record<AppLocale, string> = {
  "en-US": "en",
  "es-ES": "es",
  "pt-BR": "pt-br",
};

/**
 * The address of a page of the web app in the app's language, or null when `EXPO_PUBLIC_WEB_URL` isn't set
 * (the rows that open it are then hidden). A trailing slash in the variable is dropped.
 */
export const getWebPageUrl = (page: WebPage, locale: AppLocale) => {
  const base = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, "");

  return base ? `${base}/${webLanguages[locale]}/${page}` : null;
};
