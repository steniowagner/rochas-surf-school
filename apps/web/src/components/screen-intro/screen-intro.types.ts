import type { ReactNode } from "react";

export type ScreenIntroProps = {
  /** Left out, the intro has no icon tile. */
  icon?: ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  /** A token class for the icon tile's background. */
  iconTileClassName?: string;
  /** A token class for the eyebrow's color. */
  eyebrowClassName?: string;
};
