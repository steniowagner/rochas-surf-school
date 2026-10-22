import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { MAX_BADGE_COUNT } from "./header-button.constants";
import type { UseHeaderButtonProps } from "./header-button.types";

export const useHeaderButton = ({
  badge = 0,
  standalone = false,
}: UseHeaderButtonProps) => {
  const scheme = useColorScheme();
  const badgeText =
    badge <= 0
      ? null
      : badge > MAX_BADGE_COUNT
        ? `${MAX_BADGE_COUNT}+`
        : String(badge);

  return {
    badgeText,
    showGlass: standalone && isLiquidGlassAvailable(),
    // The app has its own theme switch, so the glass follows it rather than the system's.
    glassColorScheme:
      scheme === "light" || scheme === "dark" ? scheme : ("auto" as const),
  };
};
