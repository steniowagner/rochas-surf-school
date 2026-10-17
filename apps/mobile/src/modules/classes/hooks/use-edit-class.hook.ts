import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPut } from "@/services/api";

import { ClassItem, EditClassRequest } from "../classes.types";

/** Saves a class and refreshes the cached weeks and its details; errors are the screen's to show. */
export const useEditClass = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a repeated save would notify the instructors twice.
    retry: false,
    mutationFn: (request: EditClassRequest) =>
      apiPut<ClassItem>(`/classes/${id}`, request, { authenticated: true }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classes", "week"] }),
        queryClient.invalidateQueries({ queryKey: ["classes", "detail", id] }),
      ]),
  });
};
