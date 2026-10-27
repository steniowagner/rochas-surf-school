import { typography } from "@rochas-surf-school/design-tokens";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

import { fontFamilyByWeight } from "@/constants/font-families";
import { useTheme } from "@/hooks/use-theme";

import { StackHeaderOptions } from "./stack-header.types";

const { font, weight, size } = typography.screenTitleWithBack;

/**
 * The native header every screen that can go back shares (see spec 038, D-03): transparent with a soft top
 * scroll-edge effect where the system draws Liquid Glass (iOS 26+), opaque `page` elsewhere. Titles follow each
 * platform: centered on iOS (which ignores `headerTitleAlign`), at the left on Android; screens don't override it.
 * On Android an empty `title` keeps the title view next to the back arrow: with the route name as the native title,
 * the toolbar holds the default 72dp start inset after the arrow.
 */
export const useStackHeader = (): StackHeaderOptions => {
  const theme = useTheme();

  return {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTitle: "",
    headerTitleAlign: "left",
    ...(Platform.OS === "android" ? { title: "" } : null),
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
