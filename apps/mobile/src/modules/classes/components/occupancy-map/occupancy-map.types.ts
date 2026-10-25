import type { ClassItem } from "../../classes.types";

export type OccupancyMapProps = {
  /** The Monday of the week, `YYYY-MM-DD`. */
  weekStart: string;
  /** Today, `YYYY-MM-DD` in America/Fortaleza. */
  today: string;
  /** The classes of the week, in the API's order. */
  classes: ClassItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};
