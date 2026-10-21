import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiDelete } from "@/services/api";

import { RemoveGuestVariables } from "../enrolment.types";

/** Takes a trial guest out of a class, which frees the seat, and refreshes every cached class. */
export const useRemoveGuest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id }: RemoveGuestVariables) =>
      apiDelete(`/guests/${id}`, undefined, { authenticated: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};
