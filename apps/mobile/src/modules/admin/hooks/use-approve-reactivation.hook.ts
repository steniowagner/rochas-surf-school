import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { ReactivationDecision } from "../reactivations.types";
import { isReactivationAlreadyDecided } from "../utils/reactivation-error";
import {
  REACTIVATIONS_QUERY_KEY,
  removeReactivationRequest,
} from "../utils/reactivations-cache";

/** Approves the request of the account with the given id; the caller shows the errors. */
export const useApproveReactivation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (id: string) =>
      apiPost<ReactivationDecision>(
        `/reactivation-requests/${id}/approve`,
        {},
        { authenticated: true },
      ),
    onSuccess: (_decision, id) => removeReactivationRequest(queryClient, id),
    onError: (error) => {
      if (isReactivationAlreadyDecided(error)) {
        return queryClient.invalidateQueries({
          queryKey: REACTIVATIONS_QUERY_KEY,
        });
      }
    },
  });
};
