import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { LocationsResponse } from "../classes.types";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";

/** Every saved location, sorted by name. */
export const useLocations = () =>
  useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: () =>
      apiGet<LocationsResponse>("/locations", { authenticated: true }),
    retry: false,
  });
