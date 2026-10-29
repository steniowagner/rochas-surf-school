import { glyphs } from "./app-icon.constants";
import type { AppIconProps } from "./app-icon.types";

/** Draws one of the app's own glyphs; its color is the text color around it. */
export function AppIcon({ name, size = 24, className }: AppIconProps) {
  const Glyph = glyphs[name];

  return <Glyph size={size} className={className} aria-hidden />;
}
