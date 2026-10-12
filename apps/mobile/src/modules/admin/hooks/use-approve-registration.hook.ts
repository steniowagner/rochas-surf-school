import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { RegistrationDecision } from "../registrations.types";
import { isAlreadyDecided } from "../utils/registration-error";
import {
  REGISTRATIONS_QUERY_KEY,
  removeRegistration,
} from "../utils/registrations-cache";

/** Approves the registration with the given id; the caller shows the errors (see `getRegistrationErrorKey`). */
export const useApproveRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (id: string) =>
      apiPost<RegistrationDecision>(
        `/registrations/${id}/approve`,
        {},
        { authenticated: true },
      ),
    onSuccess: (_decision, id) => removeRegistration(queryClient, id),
    onError: (error) => {
      if (isAlreadyDecided(error)) {
        return queryClient.invalidateQueries({
          queryKey: REGISTRATIONS_QUERY_KEY,
        });
      }
    },
  });
};
