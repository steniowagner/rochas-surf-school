import type { AppIconName } from "../app-icon";

export type HeaderButtonProps = {
  icon: AppIconName;
  iconSize?: number;
  /** What a screen reader says: the button has no visible label. */
  label: string;
  /** A count in a `bad` pill over the icon's top right; `0` or none hides it. */
  badge?: number;
  /** Outside a native header (the user header): draws the 44-point circle the header gives its items. */
  standalone?: boolean;
};
