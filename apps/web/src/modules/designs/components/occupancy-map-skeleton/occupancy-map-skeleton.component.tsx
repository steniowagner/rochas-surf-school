import { appT } from "@/modules/designs/i18n/app-t";

import { Skeleton } from "../skeleton";

import type { OccupancyMapSkeletonProps } from "./occupancy-map-skeleton.types";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const ROWS = [0, 1, 2, 3];

/** The stats card and the map while the week loads: the card, the header row and four rows of cells with the map's measures. */
export function OccupancyMapSkeleton({ locale }: OccupancyMapSkeletonProps) {
  return (
    <div role="status" aria-label={appT(locale, "weeklyOccupancy.loading")} data-testid="occupancy-map-skeleton" className="flex flex-col gap-5">
      <Skeleton className="h-18 w-full rounded-card" />
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <span className="w-11 shrink-0" />
          {DAYS.map((day) => (
            <Skeleton key={day} className="h-9.5 min-w-0 flex-1 rounded" />
          ))}
        </div>
        {ROWS.map((row) => (
          <div key={row} className="flex gap-1">
            <span className="flex h-11 w-11 shrink-0 items-center">
              <Skeleton className="h-4 w-9 rounded" />
            </span>
            {DAYS.map((day) => (
              <Skeleton key={day} className="h-11 min-w-0 flex-1 rounded-occupancy-cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
