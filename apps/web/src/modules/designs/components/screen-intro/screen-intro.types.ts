import type { ReactNode } from "react";

export type ScreenIntroProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  eyebrow?: string;
  iconTileClassName?: string;
  eyebrowClassName?: string;
};
