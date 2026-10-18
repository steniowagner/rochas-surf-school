import { typography } from "@rochas-surf-school/design-tokens";

import { fontFamilyByWeight } from "@/constants/font-families";
import { useTheme } from "@/hooks/use-theme";

import { StackHeaderOptions } from "./stack-header.types";

const { font, weight, size } = typography.screenTitleWithBack;

/** The native header every screen that can go back shares (see spec 038, D-03). */
export const useStackHeader = (): StackHeaderOptions => {
  const theme = useTheme();

  return {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTitle: "",
    headerStyle: { backgroundColor: theme.page },
    headerTintColor: theme.ink,
    headerTitleStyle: {
      color: theme.ink,
      fontFamily: fontFamilyByWeight[font][weight],
      fontSize: size,
    },
  };
};
