import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { apiPost } from "@/services/api";

import { CreateSchoolRuleVariables, SchoolRules } from "../school-rules.types";
import { getSchoolRuleErrorKey } from "../utils/school-rules-error";

import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

/**
 * Adds a rule (it goes last) with its text trimmed and puts the answer — the version and the whole list — in the
 * cache. Errors show in the toast, except an expired session, which is handled once for the whole app; the caller
 * keeps its draft (spec 056, D-07).
 */
export const useCreateSchoolRule = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: ({ title, description }: CreateSchoolRuleVariables) =>
      apiPost<SchoolRules>(
        "/school-rules",
        { title: title.trim(), description: description.trim() },
        { authenticated: true },
      ),
    onSuccess: (rules) => {
      queryClient.setQueryData<SchoolRules>(SCHOOL_RULES_QUERY_KEY, rules);
    },
    onError: (error) => {
      const key = getSchoolRuleErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    },
  });
};
