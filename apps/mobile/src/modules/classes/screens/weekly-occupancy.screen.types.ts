import type { ClassItem } from "../classes.types";

export type UseWeeklyOccupancyScreenResult = {
  now: Date;
  /** Today, `YYYY-MM-DD` in America/Fortaleza. */
  today: string;
  /** The Monday of the week on screen. */
  weekStart: string;
  /** "19 – 25 OCT". */
  caption: string;
  classes: ClassItem[];
  selectedId: string | null;
  selected: ClassItem | null;
  goPrevious: () => void;
  goNext: () => void;
  selectClass: (id: string) => void;
  openClass: (id: string) => void;
};
