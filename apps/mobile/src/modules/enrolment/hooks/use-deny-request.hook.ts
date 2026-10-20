import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { DenyRequestVariables, EnrolmentResponse } from "../enrolment.types";

import { PENDING_REQUESTS_QUERY_KEY } from "./use-pending-requests.hook";

/** Denies a pending request with an optional reason and refreshes the tool and every cached class. */
export const useDenyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, reason }: DenyRequestVariables) =>
      apiPost<EnrolmentResponse>(
        `/enrolments/${id}/deny`,
        reason.trim() ? { reason } : {},
        { authenticated: true },
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]),
  });
};
