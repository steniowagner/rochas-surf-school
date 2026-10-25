export type OccupancyLegendItem = {
  /** The swatch's background class. */
  swatch: string;
  /** The translation key, under `weeklyOccupancy.legend`. */
  key: "low" | "mid" | "high" | "full";
};
