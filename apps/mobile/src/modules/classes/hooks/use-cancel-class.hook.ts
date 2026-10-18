import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { CancelClassRequest, ClassItem } from "../classes.types";

/** Cancels a class and refreshes every cached week and detail; errors are the screen's to show. */
export const useCancelClass = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a repeated cancel would notify the instructors twice.
    retry: false,
    mutationFn: (request: CancelClassRequest) =>
      apiPost<ClassItem>(`/classes/${id}/cancel`, request, { authenticated: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};
