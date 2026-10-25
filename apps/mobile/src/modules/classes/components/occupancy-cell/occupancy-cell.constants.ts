import type { OccupancyCellTone } from "../../utils/weekly-occupancy";

/** The background, border and text of a cell for each step of the scale. */
export const CELL_CLASSES: Record<
  OccupancyCellTone,
  { fill: string; border: string; text: string }
> = {
  cancelled: {
    fill: "bg-dim",
    border: "border border-line",
    text: "text-ink-3 line-through",
  },
  full: { fill: "bg-bad", border: "", text: "text-on-color" },
  high: { fill: "bg-sun", border: "", text: "text-on-color" },
  mid: { fill: "bg-sun-tint", border: "", text: "text-ink" },
  low: { fill: "bg-info-tint", border: "", text: "text-lagoon" },
};

export const SELECTED_BORDER_CLASSES = "border-2 border-grape";
