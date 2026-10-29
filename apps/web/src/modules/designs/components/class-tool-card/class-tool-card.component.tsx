import { AppIcon } from "../app-icon";

import type { ClassToolCardProps } from "./class-tool-card.types";

/** One action of the class tools sheet: an icon tile, a bold title and a small subtitle. */
export function ClassToolCard({ icon, title, subtitle, tone = "default", disabled = false }: ClassToolCardProps) {
  const danger = tone === "danger";

  return (
    <button type="button" aria-label={title} disabled={disabled} className="flex min-h-11 flex-1 text-left">
      <span
        className={`flex flex-1 flex-col gap-2.5 rounded-card border p-3.5 ${danger ? "border-bad-tint bg-bad-tint" : "border-line bg-surface"} ${disabled ? "opacity-50" : ""}`}
      >
        <span className={`flex size-10 items-center justify-center rounded-checkbox ${danger ? "bg-surface" : "bg-dim"}`}>
          <AppIcon name={icon} size={20} className={danger ? "text-bad" : "text-lagoon"} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className={`ds-text-list-title ${danger ? "text-bad" : "text-ink"}`}>{title}</span>
          <span className="ds-text-list-subtitle text-ink-2">{subtitle}</span>
        </span>
      </span>
    </button>
  );
}
