import { ReactNode } from "react";

export type ScreenIntroProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  /** Small uppercase label between the icon and the title. */
  eyebrow?: string;
  /** Background class of the icon tile (a token class such as `bg-warn-tint`). Defaults to `bg-sand`. */
  iconTileClassName?: string;
  /** Text color class of the eyebrow (a token class such as `text-ok`). Defaults to `text-ink-2`. */
  eyebrowClassName?: string;
  /** Where the title ends, from the top of the intro, once laid out (to know when it scrolls under a header). */
  onTitleLayout?: (bottom: number) => void;
};
