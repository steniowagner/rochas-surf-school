import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { EnrolmentResponse, TakeStudentOutVariables } from "../enrolment.types";

import { PENDING_REQUESTS_QUERY_KEY } from "./use-pending-requests.hook";

/** Takes a student out of a class, with an optional reason, and refreshes the requests and every cached class. */
export const useTakeStudentOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, reason }: TakeStudentOutVariables) =>
      apiPost<EnrolmentResponse>(
        `/enrolments/${id}/take-out`,
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
