import type { AppLocale } from "./locales";

// The backend's locales (sign-in email, push text) differ from the app's.
const backendLocaleByAppLocale: Record<AppLocale, string> = {
  "en-US": "en",
  "es-ES": "es",
  "pt-BR": "pt-BR",
};

export const toBackendLocale = (appLocale: AppLocale): string =>
  backendLocaleByAppLocale[appLocale];
