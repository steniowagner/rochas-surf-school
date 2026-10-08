import { colors, type ColorScheme } from "@rochas-surf-school/design-tokens";
import { vars } from "nativewind";

import { colorVariable } from "./token-names";

function paletteVariables(scheme: ColorScheme) {
  return vars(
    Object.fromEntries(
      Object.entries(colors[scheme]).map(([token, value]) => [
        colorVariable(token),
        value,
      ]),
    ),
  );
}

/**
 * Values for the `--ds-*` variables behind the NativeWind color utilities (`bg-page`, `text-ink-2`…).
 * The root layout applies the one that matches the OS color scheme.
 */
export const themeVariables: Record<ColorScheme, ReturnType<typeof vars>> = {
  light: paletteVariables("light"),
  dark: paletteVariables("dark"),
};
