import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { apiPut } from "@/services/api";

import {
  ReorderSchoolRulesContext,
  ReorderSchoolRulesVariables,
  SchoolRules,
} from "../school-rules.types";
import { getReorderSchoolRulesErrorKey, isOrderMismatchError } from "../utils/school-rules-error";

import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

/**
 * Sends the whole list in its new order. The cache takes the new order at once and the answer when it comes; a failure
 * puts the list back and toasts, and a stale order (another admin changed the list) also reloads it. Reordering shows
 * no success toast, and callers allow one reorder at a time through `isPending` (spec 056, D-05).
 */
export const useReorderSchoolRules = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();

  return useMutation<SchoolRules, Error, ReorderSchoolRulesVariables, ReorderSchoolRulesContext>({
    retry: false,
    mutationFn: ({ rules }) =>
      apiPut<SchoolRules>(
        "/school-rules/order",
        { ruleIds: rules.map((rule) => rule.id) },
        { authenticated: true },
      ),
    onMutate: async ({ rules }) => {
      await queryClient.cancelQueries({ queryKey: SCHOOL_RULES_QUERY_KEY });

      const previous = queryClient.getQueryData<SchoolRules>(SCHOOL_RULES_QUERY_KEY);

      queryClient.setQueryData<SchoolRules>(
        SCHOOL_RULES_QUERY_KEY,
        (data) => data && { ...data, rules: rules.map((rule, index) => ({ ...rule, index: index + 1 })) },
      );

      return { previous };
    },
    onSuccess: (rules) => {
      queryClient.setQueryData<SchoolRules>(SCHOOL_RULES_QUERY_KEY, rules);
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, context?.previous);

      if (isOrderMismatchError(error)) {
        queryClient.invalidateQueries({ queryKey: SCHOOL_RULES_QUERY_KEY });
      }

      const key = getReorderSchoolRulesErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    },
  });
};
