import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { AccountStatusChange } from "../people.types";
import { REMOVED_ACCOUNTS_QUERY_KEY } from "./use-removed-accounts.hook";

/**
 * Removes a person from the platform; on success the people lists reload (they leave the directory), so do the classes
 * (their seats and assignments were released) and the removed accounts (they show up there). The caller shows the
 * errors.
 */
export const useRemovePerson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a removal notifies the person.
    retry: false,
    mutationFn: (id: string) =>
      apiPost<AccountStatusChange>(`/people/${id}/remove`, undefined, { authenticated: true }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: REMOVED_ACCOUNTS_QUERY_KEY }),
      ]),
  });
};
