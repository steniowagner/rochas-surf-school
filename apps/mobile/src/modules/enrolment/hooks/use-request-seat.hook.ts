import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { EnrolmentResponse, RequestSeatRequest } from "../enrolment.types";

/** Asks for a seat in a class and refreshes every cached week and detail; errors are the sheet's to show. */
export const useRequestSeat = (classId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a repeated request would notify the admins twice.
    retry: false,
    mutationFn: (request: RequestSeatRequest) =>
      apiPost<EnrolmentResponse>(`/classes/${classId}/enrolments`, request, { authenticated: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};
