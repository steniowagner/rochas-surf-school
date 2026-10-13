import * as SecureStore from "expo-secure-store";

import { supportedLocales, type AppLocale } from "@/i18n/locales";

export type ThemePreference = "system" | "light" | "dark";

export const themePreferences: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

const THEME_KEY = "prefs.theme";
const LOCALE_KEY = "prefs.locale";
const PUSH_ENABLED_KEY = "prefs.pushEnabled";

const read = (key: string): string | null => {
  try {
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  try {
    SecureStore.setItem(key, value);
  } catch {
    // The choice still applies until the app closes; it just won't be remembered.
  }
};

export const readThemePreference = (): ThemePreference => {
  const value = read(THEME_KEY);

  return themePreferences.find((theme) => theme === value) ?? "system";
};

export const writeThemePreference = (theme: ThemePreference) =>
  write(THEME_KEY, theme);

/** The stored app language, or null when none was chosen (or the value is unknown). */
export const readLocalePreference = (): AppLocale | null => {
  const value = read(LOCALE_KEY);

  return supportedLocales.find((locale) => locale === value) ?? null;
};

export const writeLocalePreference = (locale: AppLocale) =>
  write(LOCALE_KEY, locale);

/** Pushes are on unless the person turned them off on this phone. */
export const readPushEnabledPreference = (): boolean =>
  read(PUSH_ENABLED_KEY) !== "false";

export const writePushEnabledPreference = (enabled: boolean) =>
  write(PUSH_ENABLED_KEY, enabled ? "true" : "false");
