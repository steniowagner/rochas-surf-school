import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import {
  ClassLocation,
  LocationsResponse,
  NewLocationVariables,
} from "../classes.types";
import { addLocation, LOCATIONS_QUERY_KEY } from "../utils/locations-cache";

/** Saves a location; on 201 it joins the cached list at once. Errors are the caller's to show. */
export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: NewLocationVariables) =>
      apiPost<ClassLocation>("/locations", variables, { authenticated: true }),
    onSuccess: (location) => {
      queryClient.setQueryData<LocationsResponse>(LOCATIONS_QUERY_KEY, (current) =>
        addLocation(current, location),
      );
    },
  });
};
