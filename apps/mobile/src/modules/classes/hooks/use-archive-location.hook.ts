import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { LocationsResponse } from "../classes.types";
import { LOCATIONS_QUERY_KEY, removeLocation } from "../utils/locations-cache";

/** Removes (archives) a location; on 204 it leaves the cached list at once. Errors are the caller's to show. */
export const useArchiveLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (id: string) =>
      apiPost<void>(`/locations/${id}/archive`, undefined, {
        authenticated: true,
      }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<LocationsResponse>(
        LOCATIONS_QUERY_KEY,
        (current) => removeLocation(current, id),
      );
    },
  });
};
