import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SCHOOL_RULES_QUERY_KEY } from "@/modules/school-rules/hooks/use-school-rules.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import {
  apiPost,
  ApiError,
  NetworkError,
  SessionExpiredError,
} from "@/services/api";

import {
  AcceptSchoolRulesResponse,
  AcceptSchoolRulesVariables,
  UseAcceptSchoolRulesProps,
} from "./use-accept-school-rules.types";

const OUTDATED_VERSION = "schoolRules.version.outdated";

/**
 * Records the acceptance of a school rules version and puts the returned account in the session, which opens the
 * role's home (spec 012, D-04). An outdated version reloads the rules; an expired session is handled once for the
 * whole app (spec 018, D-08).
 */
export const useAcceptSchoolRules = ({
  onOutdated,
}: UseAcceptSchoolRulesProps = {}) => {
  const { t } = useTranslation();
  const { updateUser } = useSession();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (variables: AcceptSchoolRulesVariables) =>
      apiPost<AcceptSchoolRulesResponse>(
        "/school-rules/acceptances",
        variables,
        { authenticated: true },
      ),
    onSuccess: (user) => updateUser(user),
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      if (error instanceof NetworkError) {
        alertMessage.show(t("createAccount.errors.noConnection"));

        return;
      }

      const errorCode = error instanceof ApiError ? error.errors[0] : undefined;

      if (
        error instanceof ApiError &&
        error.status === 409 &&
        errorCode === OUTDATED_VERSION
      ) {
        queryClient.invalidateQueries({ queryKey: SCHOOL_RULES_QUERY_KEY });
        alertMessage.show(t("schoolRules.outdated"));
        onOutdated?.();

        return;
      }

      alertMessage.show(t("createAccount.errors.generic"));
    },
  });
};
