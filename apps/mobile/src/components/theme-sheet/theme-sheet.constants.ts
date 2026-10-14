import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { ThemePreference } from "@/services/preferences/preferences.storage";

export const THEME_ICONS: Record<
  ThemePreference,
  ComponentProps<typeof Ionicons>["name"]
> = {
  system: "options-outline",
  light: "sunny-outline",
  dark: "moon-outline",
};
