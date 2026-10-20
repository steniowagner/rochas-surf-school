import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { EnrolmentResponse } from "../enrolment.types";

/** Cancels an approved seat and refreshes every cached week and detail; errors are the screen's to show. */
export const useCancelSeat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (enrolmentId: string) =>
      apiPost<EnrolmentResponse>(`/enrolments/${enrolmentId}/cancel`, undefined, {
        authenticated: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};
