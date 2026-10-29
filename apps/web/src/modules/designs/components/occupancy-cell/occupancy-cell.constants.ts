import type { OccupancyCellTone, OccupancyMapClass } from "./occupancy-cell.types";

/** The background, border and text of a cell for each step of the scale. */
export const CELL_CLASSES: Record<OccupancyCellTone, { fill: string; border: string; text: string }> = {
  cancelled: { fill: "bg-dim", border: "border border-line", text: "text-ink-3 line-through" },
  full: { fill: "bg-bad", border: "", text: "text-on-color" },
  high: { fill: "bg-sun", border: "", text: "text-on-color" },
  mid: { fill: "bg-sun-tint", border: "", text: "text-ink" },
  low: { fill: "bg-info-tint", border: "", text: "text-lagoon" },
};

export const SELECTED_BORDER_CLASSES = "border-2 border-grape";

const HIGH_PERCENT = 90;
const MID_PERCENT = 50;

/** The tone and percentage a class's cell shows, with the app's thresholds (`getOccupancyCellLook`). */
export const getOccupancyCellLook = (item: OccupancyMapClass): { tone: OccupancyCellTone; percent: number } => {
  const percent = item.capacity > 0 ? Math.min(100, Math.round((item.seatsTaken / item.capacity) * 100)) : 0;

  if (item.cancelled) {
    return { tone: "cancelled", percent };
  }

  if (item.seatsTaken >= item.capacity) {
    return { tone: "full", percent };
  }

  if (percent >= HIGH_PERCENT) {
    return { tone: "high", percent };
  }

  return { tone: percent >= MID_PERCENT ? "mid" : "low", percent };
};
