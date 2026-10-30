import { AppIcon } from "../app-icon";

import type { LocationSummaryCardProps } from "./location-summary-card.types";

/** A location in short: the pin, a title and the line under it. */
export function LocationSummaryCard({ title, subtitle }: LocationSummaryCardProps) {
  return (
    <div data-testid="location-summary-card" className="flex min-h-11 items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3">
      <AppIcon name="Feather:map-pin" size={16} className="text-lagoon" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="ds-text-list-title line-clamp-2 text-ink">{title}</p>
        {subtitle ? <p className="ds-text-list-subtitle truncate text-ink-2">{subtitle}</p> : null}
      </div>
    </div>
  );
}
