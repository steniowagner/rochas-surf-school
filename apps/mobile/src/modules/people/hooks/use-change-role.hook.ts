import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPut } from "@/services/api";

import { ChangeRoleVariables, RoleChange } from "../people.types";

/**
 * Changes a person's role; on success the people lists reload (the row shows the new chip) and so do the classes
 * (a demotion takes the person off their upcoming ones). The caller shows the errors.
 */
export const useChangeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: a role change notifies the person.
    retry: false,
    mutationFn: ({ id, role, isInstructor }: ChangeRoleVariables) =>
      apiPut<RoleChange>(
        `/people/${id}/role`,
        isInstructor === undefined ? { role } : { role, isInstructor },
        { authenticated: true },
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]),
  });
};
