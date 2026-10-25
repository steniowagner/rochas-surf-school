import type { ChipProps, ChipTone } from "./chip.types";

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

export function Chip({ tone = "info", size = "default", icon, children }: ChipProps) {
  return (
    <span
      className={`ds-text-chip inline-flex items-center gap-1 rounded-full ${size === "compact" ? "px-2 py-0.5" : "px-2.5 py-1"} ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
