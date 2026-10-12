import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import {
  DenyRegistrationVariables,
  RegistrationDecision,
} from "../registrations.types";
import { isAlreadyDecided } from "../utils/registration-error";
import {
  REGISTRATIONS_QUERY_KEY,
  removeRegistration,
} from "../utils/registrations-cache";

/** Denies the registration with the given id, with an optional reason; the caller shows the errors. */
export const useDenyRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, reason }: DenyRegistrationVariables) =>
      apiPost<RegistrationDecision>(
        `/registrations/${id}/deny`,
        reason.trim() ? { reason } : {},
        { authenticated: true },
      ),
    onSuccess: (_decision, { id }) => removeRegistration(queryClient, id),
    onError: (error) => {
      if (isAlreadyDecided(error)) {
        return queryClient.invalidateQueries({
          queryKey: REGISTRATIONS_QUERY_KEY,
        });
      }
    },
  });
};
