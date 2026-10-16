import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { BatchRequest, CreateClassesResponse } from "../classes.types";

/** Creates a batch of classes and refreshes the cached weeks; errors are the screen's to show. */
export const useCreateClasses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BatchRequest) =>
      apiPost<CreateClassesResponse>("/classes/batch", request, {
        authenticated: true,
      }),
    // The Aulas tab shows the new classes without a pull-to-refresh.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["classes", "week"] }),
  });
};
