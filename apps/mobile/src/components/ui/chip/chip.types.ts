import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type ChipTone =
  | "surf"
  | "skate"
  | "info"
  | "sun"
  | "grape"
  | "warn"
  | "ok"
  | "bad"
  | "muted"
  | "onHighlight";

export type ChipProps = {
  tone?: ChipTone;
  /** "compact" tightens the padding, for dense headers. */
  size?: "default" | "compact";
  icon?: ComponentProps<typeof Ionicons>["name"];
  children: string;
};
