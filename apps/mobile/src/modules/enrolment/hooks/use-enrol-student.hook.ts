import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { EnrolmentResponse, EnrolStudentVariables } from "../enrolment.types";

import { PENDING_REQUESTS_QUERY_KEY } from "./use-pending-requests.hook";

/** Enrols a student straight into a class and refreshes the requests and every cached class; errors are the screen's. */
export const useEnrolStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ classId, studentId }: EnrolStudentVariables) =>
      apiPost<EnrolmentResponse>(
        `/classes/${classId}/enrolments/direct`,
        { studentId },
        { authenticated: true },
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PENDING_REQUESTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]),
  });
};
