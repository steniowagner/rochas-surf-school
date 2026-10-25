import type { ReactNode } from "react";

export type ChipTone = "surf" | "skate" | "info" | "sun" | "grape" | "warn" | "ok" | "bad" | "muted" | "onHighlight";

export type ChipProps = {
  tone?: ChipTone;
  /** "compact" tightens the padding, for dense headers. */
  size?: "default" | "compact";
  icon?: ReactNode;
  children: ReactNode;
};
