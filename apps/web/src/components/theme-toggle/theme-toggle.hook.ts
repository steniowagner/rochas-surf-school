import type { Theme } from "./theme-toggle.types";

const STORAGE_KEY = "theme";

/** The theme the page is showing: the one set on `<html>`, else the OS color scheme. */
const getEffectiveTheme = (): Theme => {
  const { dataset } = document.documentElement;

  if (dataset.theme === "light" || dataset.theme === "dark") {
    return dataset.theme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useThemeToggle = () => {
  const toggleTheme = () => {
    const next: Theme = getEffectiveTheme() === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage is unavailable: the choice still applies to the current page.
    }
  };

  return { toggleTheme };
};
