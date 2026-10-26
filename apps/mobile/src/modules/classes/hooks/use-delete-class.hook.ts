import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiDelete } from "@/services/api";

/** Deletes a class, drops its details from the cache and refreshes the weeks; errors are the screen's to show. */
export const useDeleteClass = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: the instructors are told once.
    retry: false,
    mutationFn: () =>
      apiDelete<void>(`/classes/${id}`, undefined, { authenticated: true }),
    onSuccess: () => {
      // The details would otherwise refetch into a 404.
      queryClient.removeQueries({ queryKey: ["classes", "detail", id] });
      return queryClient.invalidateQueries({ queryKey: ["classes", "week"] });
    },
  });
};
