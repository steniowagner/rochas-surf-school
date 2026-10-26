import { normalizeLocationName } from "@rochas-surf-school/classes";

import { ClassLocation, LocationsResponse } from "../classes.types";

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

const sortLocations = (items: ClassLocation[]): ClassLocation[] =>
  items.sort(
    (a, b) =>
      normalizeLocationName(a.name).localeCompare(
        normalizeLocationName(b.name),
      ) || a.id.localeCompare(b.id),
  );

/** The list with the new location in the backend's order (name without accents or case, then id). */
export const addLocation = (
  current: LocationsResponse | undefined,
  location: ClassLocation,
): LocationsResponse => ({
  items: sortLocations([...(current?.items ?? []), location]),
});

/** The list with the edited location in place of the stored one, in the backend's order. */
export const replaceLocation = (
  current: LocationsResponse | undefined,
  location: ClassLocation,
): LocationsResponse => ({
  items: sortLocations([
    ...(current?.items ?? []).filter((item) => item.id !== location.id),
    location,
  ]),
});

/** The list without the removed location. */
export const removeLocation = (
  current: LocationsResponse | undefined,
  id: string,
): LocationsResponse => ({
  items: (current?.items ?? []).filter((item) => item.id !== id),
});
