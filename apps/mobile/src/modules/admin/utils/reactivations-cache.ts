import { QueryClient } from "@tanstack/react-query";

import { ReactivationRequestsResponse } from "../reactivations.types";

export const REACTIVATIONS_QUERY_KEY = ["reactivation-requests"];

/** Takes a decided request out of the cached list at once and marks the list stale for the next reader. */
export const removeReactivationRequest = (
  queryClient: QueryClient,
  id: string,
) => {
  queryClient.setQueryData<ReactivationRequestsResponse>(
    REACTIVATIONS_QUERY_KEY,
    (current) =>
      current && { items: current.items.filter((item) => item.id !== id) },
  );

  return queryClient.invalidateQueries({ queryKey: REACTIVATIONS_QUERY_KEY });
};
