import { appT } from "@/modules/designs/i18n/app-t";

import { CELL_CLASSES, getOccupancyCellLook, SELECTED_BORDER_CLASSES } from "./occupancy-cell.constants";
import type { OccupancyCellProps } from "./occupancy-cell.types";

/** One class of the map: its percentage on the color of its step, or "canc." struck through. */
export function OccupancyCell({ locale, item, weekday, dayNumber, selected }: OccupancyCellProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const { tone, percent } = getOccupancyCellLook(item);
  const { fill, border, text } = CELL_CLASSES[tone];
  const cancelled = tone === "cancelled";
  const label = t(cancelled ? "weeklyOccupancy.cell.cancelled" : "weeklyOccupancy.cell.active", {
    date: `${weekday} ${dayNumber}`,
    time: item.time,
    discipline: t(`newClass.discipline.${item.discipline}`),
    percent,
  });

  return (
    <div role="button" aria-label={label} aria-pressed={selected} className="h-11 min-w-0 flex-1">
      <div data-testid={`occupancy-cell-box-${item.id}`} className={`flex h-11 items-center justify-center rounded-occupancy-cell ${fill} ${selected ? SELECTED_BORDER_CLASSES : border}`}>
        <span className={`ds-text-occupancy-cell ${text}`}>{cancelled ? t("weeklyOccupancy.cancelledCell") : `${percent}%`}</span>
      </div>
    </div>
  );
}
