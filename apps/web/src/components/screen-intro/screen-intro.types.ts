import type { ReactNode } from "react";

export type ScreenIntroProps = {
  icon: ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  /** A token class for the icon tile's background. */
  iconTileClassName?: string;
  /** A token class for the eyebrow's color. */
  eyebrowClassName?: string;
};
