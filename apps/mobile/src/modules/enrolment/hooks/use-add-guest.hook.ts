import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { AddGuestResponse, AddGuestVariables } from "../enrolment.types";

/** Adds a trial guest to a class and refreshes every cached class; errors are the screen's. */
export const useAddGuest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ classId, name, whatsappNumber }: AddGuestVariables) =>
      apiPost<AddGuestResponse>(
        `/classes/${classId}/guests`,
        { name, whatsappNumber },
        { authenticated: true },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
};
