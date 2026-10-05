/**
 * Theme for the mobile app, built from the shared design tokens in @rochas-surf-school/design-tokens
 * (source: .docs/design-system.html). Use these values instead of hard-coded colors so
 * both light and dark themes keep working.
 */

import '@/global.css';

import {
  colors,
  elevation,
  typography,
  type ColorToken,
  type TypographyVariant,
} from '@rochas-surf-school/design-tokens';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export { radii, spacing, touchTarget, iconSizes } from '@rochas-surf-school/design-tokens';

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

const fontFamilyByWeight = {
  display: {
    400: 'BarlowCondensed_400Regular',
    500: 'BarlowCondensed_500Medium',
    600: 'BarlowCondensed_600SemiBold',
    700: 'BarlowCondensed_700Bold',
  },
  body: {
    400: 'Nunito_400Regular',
    600: 'Nunito_600SemiBold',
    700: 'Nunito_700Bold',
    800: 'Nunito_800ExtraBold',
  },
} as const satisfies Record<string, Record<number, keyof typeof FontAssets>>;

/** Converts a design-system text variant into a React Native text style. */
export function textStyle(variant: TypographyVariant): TextStyle {
  const t = typography[variant];
  const families: Record<number, string> = fontFamilyByWeight[t.font];
  return {
    fontFamily: families[t.weight],
    fontSize: t.size,
    lineHeight: Math.round(t.size * t.lineHeight),
    letterSpacing: t.letterSpacing * t.size,
    textTransform: t.uppercase ? 'uppercase' : 'none',
  };
}

/** Design-system elevation as a React Native `boxShadow`. */
export function shadowStyle(level: keyof typeof elevation, palette: Record<ColorToken, string>): ViewStyle {
  const { offsetY, blur, color } = elevation[level];
  return { boxShadow: `0 ${offsetY}px ${blur}px ${palette[color]}` };
}

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
  web: { mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
