import { AppIcon } from "../app-icon";

import type { ChipProps, ChipTone } from "./chip.types";

const toneClasses: Record<ChipTone, string> = {
  surf: "bg-lagoon text-on-color",
  skate: "bg-tan text-on-color",
  info: "bg-info-tint text-lagoon",
  sun: "bg-sun text-on-color",
  grape: "bg-grape text-on-color",
  warn: "bg-warn-tint text-ink",
  ok: "bg-ok-tint text-ok",
  bad: "bg-bad-tint text-bad",
  muted: "bg-dim text-ink-2",
  // On the grape card of a class under way.
  onHighlight: "bg-white/18 text-on-color",
};

export function Chip({ tone = "info", size = "default", icon, children }: ChipProps) {
  const compact = size === "compact";

  return (
    <span className={`ds-text-chip inline-flex items-center gap-1 self-start rounded-full ${compact ? "px-2 py-0.5" : "px-2.5 py-1"} ${toneClasses[tone]}`}>
      {icon ? <AppIcon name={icon} size={compact ? 10 : 12} /> : null}
      {children}
    </span>
  );
}
