import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

import {
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "./preferences.storage";

let current: ThemePreference = readThemePreference();
const listeners = new Set<() => void>();

const applyToApp = (theme: ThemePreference) => {
  // "unspecified" hands the choice back to the OS.
  Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
};

/** Applies the stored choice; call it before the first render so no frame shows the wrong theme. */
export const applyStoredThemePreference = () => {
  current = readThemePreference();
  applyToApp(current);
  listeners.forEach((listener) => listener());
};

export const setThemePreference = (theme: ThemePreference) => {
  current = theme;
  writeThemePreference(theme);
  applyToApp(theme);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => current;

/** The app's theme choice ("system", "light" or "dark") and a setter that applies and stores it. */
export const useThemePreference = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  return { theme, setTheme: setThemePreference };
};
