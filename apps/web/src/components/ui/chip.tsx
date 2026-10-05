import type { ReactNode } from "react";

export type ChipTone = "surf" | "skate" | "info" | "sun" | "grape" | "warn" | "ok" | "bad" | "muted" | "onHighlight";

// Solid colour for the discipline (surf/skate), light tint for level and status.
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
  // On the grape "next lesson" card.
  onHighlight: "bg-white/18 text-on-color",
};

export type ChipProps = {
  tone?: ChipTone;
  children: ReactNode;
};

export function Chip({ tone = "info", children }: ChipProps) {
  return (
    <span
      className={`ds-text-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
