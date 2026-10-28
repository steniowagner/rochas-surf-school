import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPut } from "@/services/api";

import { InstructorFlagChange, SetInstructorFlagVariables } from "../people.types";

/**
 * Switches whether an admin can also be assigned to teach; on success the people lists reload, which also reloads the
 * instructor pickers of the classes (`["people", "teachers"]`). The caller shows the errors.
 */
export const useSetInstructorFlag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // No retry: the person's sheet shows the result of a single tap.
    retry: false,
    mutationFn: ({ id, isInstructor }: SetInstructorFlagVariables) =>
      apiPut<InstructorFlagChange>(
        `/people/${id}/instructor`,
        { isInstructor },
        { authenticated: true },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people"] }),
  });
};
