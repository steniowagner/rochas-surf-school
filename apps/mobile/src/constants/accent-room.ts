// Kept free of React Native imports so tailwind.config.ts can load it in Node.
import {
  typography,
  type TypographyVariant,
} from "@rochas-surf-school/design-tokens";

// iOS clips glyphs at the top of a Text, and a line box as tall as the font leaves no room for an accent over a
// capital (the tilde of "NÃO"). Uppercase titles get this much room above, padded in and cancelled by an equal
// negative margin (see tailwind.config.ts), so the layout doesn't move. The wordmark sets its own leading and
// margins, so it is left out.
const ACCENT_ROOM_EM = 0.25;

/** Room in px a type style keeps above its first line for accents, or 0 when it needs none. */
export const accentRoom = (variant: TypographyVariant) => {
  const t = typography[variant];

  return t.uppercase && t.lineHeight === 1
    ? Math.round(t.size * ACCENT_ROOM_EM)
    : 0;
};
