import type { Locale } from "@/i18n/locales";

import type { OccupancyMapClass } from "../occupancy-cell/occupancy-cell.types";

export type OccupancyMapDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** "SEG". */
  weekday: string;
  /** "7". */
  dayNumber: string;
  isToday: boolean;
};

/** A cell of the map: a class, or an empty slot where the day has none in that row. */
export type OccupancyMapSlot = { kind: "class"; item: OccupancyMapClass } | { kind: "empty"; date: string };

export type OccupancyMapRow = {
  /** "08:00". */
  time: string;
  /** The first row of its time, the only one that shows the time. */
  showsTime: boolean;
  /** One slot per day, Monday first. */
  slots: OccupancyMapSlot[];
};

export type OccupancyMapProps = {
  locale: Locale;
  days: OccupancyMapDay[];
  rows: OccupancyMapRow[];
  selectedId: string | null;
};
