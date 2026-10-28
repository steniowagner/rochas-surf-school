import type { AppIconName } from "../app-icon";

export type ChipTone = "surf" | "skate" | "info" | "sun" | "grape" | "warn" | "ok" | "bad" | "muted" | "onHighlight";

export type ChipProps = {
  tone?: ChipTone;
  size?: "default" | "compact";
  icon?: AppIconName;
  children: string;
};
