import type { glyphs } from "./app-icon.constants";

export type AppIconName = keyof typeof glyphs;

export type AppIconProps = {
  /** `"<set>:<name>"`, with the set and name the app passes to `@expo/vector-icons`. */
  name: AppIconName;
  /** In points, like the app's `size`. */
  size?: number;
  className?: string;
};
