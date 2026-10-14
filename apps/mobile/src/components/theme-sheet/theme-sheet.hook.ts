import type { ThemePreference } from "@/services/preferences/preferences.storage";
import { useThemePreference } from "@/services/preferences/theme-preference";

import { UseThemeSheetProps } from "./theme-sheet.types";

export const useThemeSheet = ({ onClose }: UseThemeSheetProps) => {
  const { theme, setTheme } = useThemePreference();

  const selectTheme = (choice: ThemePreference) => {
    setTheme(choice);
    onClose();
  };

  return { theme, selectTheme };
};
