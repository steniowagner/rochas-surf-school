import { ReactNode } from "react";

export type ScreenIntroProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  /** Small uppercase label between the icon and the title. */
  eyebrow?: string;
  /** Background class of the icon tile (a token class such as `bg-warn-tint`). Defaults to `bg-sand`. */
  iconTileClassName?: string;
};
