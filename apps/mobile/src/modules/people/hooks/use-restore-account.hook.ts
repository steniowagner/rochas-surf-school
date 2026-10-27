import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { AccountStatusChange } from "../people.types";
import { REMOVED_ACCOUNTS_QUERY_KEY } from "./use-removed-accounts.hook";

/**
 * Restores a removed account; on success the removed accounts reload (the row leaves) and so do the people (the
 * person is back in the directory). The caller shows the errors.
 */
export const useRestoreAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a restore notifies the person.
    retry: false,
    mutationFn: (id: string) =>
      apiPost<AccountStatusChange>(`/people/${id}/restore`, undefined, { authenticated: true }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: REMOVED_ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
      ]),
  });
};
