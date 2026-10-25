import type { OccupancyLegendItem } from "./occupancy-legend.types";

export const LEGEND_ITEMS: OccupancyLegendItem[] = [
  { swatch: "bg-info-tint", key: "low" },
  { swatch: "bg-sun-tint", key: "mid" },
  { swatch: "bg-sun", key: "high" },
  { swatch: "bg-bad", key: "full" },
];
