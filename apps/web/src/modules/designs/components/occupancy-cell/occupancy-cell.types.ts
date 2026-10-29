import type { Locale } from "@/i18n/locales";

/** A class of the week, as the map draws it. */
export type OccupancyMapClass = {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** "08:00". */
  time: string;
  discipline: "surf" | "skate";
  seatsTaken: number;
  capacity: number;
  cancelled: boolean;
};

/** The look of a cell: the steps of the scale, plus the full and the cancelled classes. */
export type OccupancyCellTone = "cancelled" | "full" | "high" | "mid" | "low";

export type OccupancyCellProps = {
  locale: Locale;
  item: OccupancyMapClass;
  /** "SEG": the weekday of the class, for the accessible name. */
  weekday: string;
  /** "7". */
  dayNumber: string;
  selected: boolean;
};
