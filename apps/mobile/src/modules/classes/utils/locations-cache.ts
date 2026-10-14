import { normalizeLocationName } from "@rochas-surf-school/classes";

import { ClassLocation, LocationsResponse } from "../classes.types";

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

/** The list with the new location in the backend's order (name without accents or case, then id). */
export const addLocation = (
  current: LocationsResponse | undefined,
  location: ClassLocation,
): LocationsResponse => ({
  items: [...(current?.items ?? []), location].sort(
    (a, b) =>
      normalizeLocationName(a.name).localeCompare(normalizeLocationName(b.name)) ||
      a.id.localeCompare(b.id),
  ),
});
