import type { MapPoint } from "../../classes.types";

export type ClassLocationCardProps = {
  name: string;
  address: string;
  /** `null` for a location saved without one: no map and no directions. */
  point: MapPoint | null;
};
