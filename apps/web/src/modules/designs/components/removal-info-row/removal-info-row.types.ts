import type { AppIconName } from "../app-icon";

export type RemovalInfoRowProps = {
  icon: AppIconName;
  text: string;
  /** `danger` draws the row in the bad colors, for what can't be undone. */
  tone?: "default" | "danger";
};
