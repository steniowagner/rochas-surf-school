import { appT } from "@/modules/designs/i18n/app-t";

import { LEGEND_ITEMS } from "./occupancy-legend.constants";
import type { OccupancyLegendProps } from "./occupancy-legend.types";

/** The map's scale: a swatch and its range for each step. */
export function OccupancyLegend({ locale }: OccupancyLegendProps) {
  return (
    <div data-testid="occupancy-legend" className="flex flex-wrap gap-x-3.5 gap-y-1.5">
      {LEGEND_ITEMS.map(({ swatch, key }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span data-testid={`occupancy-legend-swatch-${key}`} className={`size-2.5 rounded-swatch ${swatch}`} />
          <span className="ds-text-occupancy text-ink-2">{appT(locale, `weeklyOccupancy.legend.${key}`)}</span>
        </div>
      ))}
    </div>
  );
}
