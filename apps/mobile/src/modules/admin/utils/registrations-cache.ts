import { QueryClient } from "@tanstack/react-query";

import { RegistrationsResponse } from "../registrations.types";

export const REGISTRATIONS_QUERY_KEY = ["registrations"];

/** Takes a decided registration out of the cached list at once and marks the list stale for the next reader. */
export const removeRegistration = (queryClient: QueryClient, id: string) => {
  queryClient.setQueryData<RegistrationsResponse>(
    REGISTRATIONS_QUERY_KEY,
    (current) =>
      current && { items: current.items.filter((item) => item.id !== id) },
  );

  return queryClient.invalidateQueries({ queryKey: REGISTRATIONS_QUERY_KEY });
};
