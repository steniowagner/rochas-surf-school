import { AppIcon } from "../app-icon";

import type { ClassLocationCardProps } from "./class-location-card.types";

/** The "Onde e como" card: the map across the top, then the place and "Direções". */
export function ClassLocationCard({ name, address, directionsLabel }: ClassLocationCardProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div data-testid="map-preview" className="flex h-24 items-center justify-center bg-info-tint text-lagoon">
        <AppIcon name="Feather:map-pin" size={28} />
      </div>
      <div className="flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 py-3">
        <AppIcon name="Feather:map-pin" size={16} className="text-lagoon" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="ds-text-list-title truncate text-ink">{name}</p>
          <p className="ds-text-list-subtitle text-ink-2">{address}</p>
        </div>
        <span role="button" aria-label={directionsLabel} className="ds-text-section-label flex min-h-11 items-center gap-1 text-lagoon">
          {directionsLabel}
          <AppIcon name="Feather:arrow-up-right" size={13} />
        </span>
      </div>
    </div>
  );
}
