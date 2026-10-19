import { typography } from "@rochas-surf-school/design-tokens";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { fontFamilyByWeight } from "@/constants/font-families";
import { useTheme } from "@/hooks/use-theme";

import { StackHeaderOptions } from "./stack-header.types";

const { font, weight, size } = typography.screenTitleWithBack;

/**
 * The native header every screen that can go back shares (see spec 038, D-03): transparent with a soft top
 * scroll-edge effect where the system draws Liquid Glass (iOS 26+), opaque `page` elsewhere.
 */
export const useStackHeader = (): StackHeaderOptions => {
  const theme = useTheme();

  return {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTitle: "",
    headerTintColor: theme.ink,
    headerTitleStyle: {
      color: theme.ink,
      fontFamily: fontFamilyByWeight[font][weight],
      fontSize: size,
    },
    ...(isLiquidGlassAvailable()
      ? {
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          scrollEdgeEffects: { top: "soft" },
        }
      : { headerStyle: { backgroundColor: theme.page } }),
  };
};
