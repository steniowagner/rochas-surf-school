import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import {
  DenyReactivationVariables,
  ReactivationDecision,
} from "../reactivations.types";
import { isReactivationAlreadyDecided } from "../utils/reactivation-error";
import {
  REACTIVATIONS_QUERY_KEY,
  removeReactivationRequest,
} from "../utils/reactivations-cache";

/** Denies the request of the account with the given id, with an optional reason; the caller shows the errors. */
export const useDenyReactivation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, reason }: DenyReactivationVariables) =>
      apiPost<ReactivationDecision>(
        `/reactivation-requests/${id}/deny`,
        reason.trim() ? { reason } : {},
        { authenticated: true },
      ),
    onSuccess: (_decision, { id }) => removeReactivationRequest(queryClient, id),
    onError: (error) => {
      if (isReactivationAlreadyDecided(error)) {
        return queryClient.invalidateQueries({
          queryKey: REACTIVATIONS_QUERY_KEY,
        });
      }
    },
  });
};
