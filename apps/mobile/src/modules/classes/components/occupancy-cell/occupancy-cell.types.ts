import type { ClassItem } from "../../classes.types";

export type OccupancyCellProps = {
  item: ClassItem;
  /** "MON": the weekday of the class, for the accessibility label. */
  weekday: string;
  /** "19". */
  dayNumber: string;
  selected: boolean;
  onPress: (id: string) => void;
};
