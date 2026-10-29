import { AppIcon } from "../app-icon";

import type { RemovalInfoRowProps } from "./removal-info-row.types";

/** A line of a removed account's card: an icon in a tinted tile and the text beside it. */
export function RemovalInfoRow({ icon, text, tone = "default" }: RemovalInfoRowProps) {
  const danger = tone === "danger";

  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-7 items-center justify-center rounded-checkbox ${danger ? "bg-bad-tint" : "bg-sun-tint"}`}>
        <AppIcon name={icon} size={14} className={danger ? "text-bad" : "text-lagoon"} />
      </span>
      <p className={`ds-text-list-subtitle flex-1 ${danger ? "text-bad" : "text-ink-2"}`}>{text}</p>
    </div>
  );
}
