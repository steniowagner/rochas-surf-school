/**
 * Theme values for the mobile app, from the shared design tokens in @rochas-surf-school/design-tokens
 * (source: .docs/designs/design-system.html). Styling goes through NativeWind classes; these exports are
 * for the cases a class can't cover (colors passed as props, elevation, font loading).
 */

import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  colors,
  elevation,
  type ColorToken,
} from "@rochas-surf-school/design-tokens";
import type { ViewStyle } from "react-native";

import { fontFamilyByWeight } from "@/constants/font-families";

export {
  radii,
  spacing,
  touchTarget,
  iconSizes,
} from "@rochas-surf-school/design-tokens";

export const Colors = colors;

export type ThemeColor = ColorToken;

// Passed to `useFonts` in the root layout. React Native picks a weight by family name
// (fontWeight does not select custom font files on Android), so each weight is its own family.
export const FontAssets = {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};

// Every family the type styles use must be one of the fonts loaded above.
fontFamilyByWeight satisfies Record<
  string,
  Record<number, keyof typeof FontAssets>
>;

/** Design-system elevation as a React Native `boxShadow`. */
export function shadowStyle(
  level: keyof typeof elevation,
  palette: Record<ColorToken, string>,
): ViewStyle {
  const { offsetY, blur, color } = elevation[level];
  return { boxShadow: `0 ${offsetY}px ${blur}px ${palette[color]}` };
}
