import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { EnrolmentResponse } from "../enrolment.types";

import { PENDING_REQUESTS_QUERY_KEY } from "./use-pending-requests.hook";

/** Approves a pending request and refreshes the tool and every cached class; errors are the screen's to show. */
export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (enrolmentId: string) =>
      apiPost<EnrolmentResponse>(`/enrolments/${enrolmentId}/approve`, {}, { authenticated: true }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]),
  });
};
