import { MapPlace, MapPoint } from "../../classes.types";

export type LocationAddressCardProps = {
  /** The place picked so far, or `null` before any point. */
  place: MapPlace | null;
  /** An address is being looked up. */
  resolving: boolean;
  /** The point that was tapped while its address is looked up; `null` for a suggestion. */
  pendingPoint: MapPoint | null;
};
