// Tailwind theme for NativeWind, built from @rochas-surf-school/design-tokens so mobile and web share the
// same utility names (bg-page, text-ink-2, rounded-card, ds-text-screen-title…). Never add raw colors here:
// add the token to packages/design-tokens/src/tokens.ts instead.
import {
  colors,
  radii,
  spacing,
  typography,
} from "@rochas-surf-school/design-tokens";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

import { fontFamilyByWeight } from "./src/constants/font-families";
import { colorVariable, kebab } from "./src/constants/token-names";

// nativewind/preset ships without module typings, so it is loaded with require.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
const nativewindPreset: Partial<Config> = require("nativewind/preset");

// Colors point at CSS variables; the root layout sets them to the light or dark palette (see theme-variables.ts).
const colorUtilities = Object.fromEntries(
  Object.keys(colors.light).map((name) => [
    kebab(name),
    `var(${colorVariable(name)})`,
  ]),
);

// React Native needs absolute line heights and letter spacing, so the em/ratio values are resolved to px.
const typeStyles = Object.fromEntries(
  Object.entries(typography).map(([name, t]) => {
    const families: Record<number, string> = fontFamilyByWeight[t.font];

    return [
      `.ds-text-${kebab(name)}`,
      {
        fontFamily: families[t.weight],
        fontSize: `${t.size}px`,
        lineHeight: `${Math.round(t.size * t.lineHeight)}px`,
        letterSpacing: `${t.letterSpacing * t.size}px`,
        textTransform: t.uppercase ? "uppercase" : "none",
      },
    ];
  }),
);

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: colorUtilities,
      // One family per weight (font-body-800, font-display-700…), because custom fonts can't use fontWeight.
      fontFamily: Object.fromEntries(
        Object.entries(fontFamilyByWeight).flatMap(([role, families]) =>
          Object.entries(families).map(([weight, family]) => [
            `${role}-${weight}`,
            family,
          ]),
        ),
      ),
      borderRadius: {
        control: `${radii.control}px`,
        card: `${radii.card}px`,
        sheet: `${radii.sheet}px`,
      },
      spacing: {
        screen: `${spacing.screen}px`,
        "card-gap": `${spacing.cardGap}px`,
        "group-gap": `${spacing.groupGap}px`,
      },
    },
  },
  plugins: [plugin(({ addComponents }) => addComponents(typeStyles))],
} satisfies Config;
