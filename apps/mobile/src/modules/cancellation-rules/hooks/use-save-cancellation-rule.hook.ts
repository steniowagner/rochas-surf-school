import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { apiPut, NetworkError, SessionExpiredError } from "@/services/api";

import {
  CancellationRules,
  SaveCancellationRuleVariables,
} from "../cancellation-rules.types";

import { CANCELLATION_RULES_QUERY_KEY } from "./use-cancellation-rules.hook";

/**
 * Saves one rule and puts the answer (both rules) in the cache. Errors show in the toast, except an expired session,
 * which is handled once for the whole app; the caller keeps its draft.
 */
export const useSaveCancellationRule = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: ({ discipline, text }: SaveCancellationRuleVariables) =>
      apiPut<CancellationRules>(
        `/cancellation-rules/${discipline}`,
        { text },
        { authenticated: true },
      ),
    onSuccess: (rules) => {
      queryClient.setQueryData<CancellationRules>(CANCELLATION_RULES_QUERY_KEY, rules);
    },
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      alertMessage.show(
        error instanceof NetworkError
          ? t("createAccount.errors.noConnection")
          : t("createAccount.errors.generic"),
      );
    },
  });
};
