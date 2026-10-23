import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { apiPut } from "@/services/api";

import { SchoolRules, UpdateSchoolRuleVariables } from "../school-rules.types";
import { getSchoolRuleErrorKey, isRuleNotFoundError } from "../utils/school-rules-error";

import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

/**
 * Saves a rule's new text, trimmed, and puts the answer in the cache. A rule that no longer exists reloads the list;
 * errors show in the toast, except an expired session, which is handled once for the whole app (spec 056, D-07).
 */
export const useUpdateSchoolRule = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: ({ id, title, description }: UpdateSchoolRuleVariables) =>
      apiPut<SchoolRules>(
        `/school-rules/${id}`,
        { title: title.trim(), description: description.trim() },
        { authenticated: true },
      ),
    onSuccess: (rules) => {
      queryClient.setQueryData<SchoolRules>(SCHOOL_RULES_QUERY_KEY, rules);
    },
    onError: (error) => {
      if (isRuleNotFoundError(error)) {
        queryClient.invalidateQueries({ queryKey: SCHOOL_RULES_QUERY_KEY });
      }

      const key = getSchoolRuleErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    },
  });
};
