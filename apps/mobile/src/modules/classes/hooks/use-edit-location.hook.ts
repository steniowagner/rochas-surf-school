import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPut } from "@/services/api";

import { ClassLocation, EditLocationVariables, LocationsResponse } from "../classes.types";
import { LOCATIONS_QUERY_KEY, replaceLocation } from "../utils/locations-cache";

/**
 * Saves a location; on 200 its row in the cached list is replaced at once, and the cached classes (weeks and
 * details) are reloaded, since the edit applies to every class at the location and may clear their deadlines. No
 * retry: a repeated save would tell the instructors twice. Errors are the caller's to show.
 */
export const useEditLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, ...body }: EditLocationVariables) =>
      apiPut<ClassLocation>(`/locations/${id}`, body, { authenticated: true }),
    onSuccess: (location) => {
      queryClient.setQueryData<LocationsResponse>(LOCATIONS_QUERY_KEY, (current) =>
        replaceLocation(current, location),
      );
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
};
