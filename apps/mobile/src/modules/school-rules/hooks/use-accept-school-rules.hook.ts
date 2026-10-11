import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { SCHOOL_RULES_QUERY_KEY } from "@/modules/school-rules/hooks/use-school-rules.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { apiPost, ApiError, NetworkError } from "@/services/api";

import {
  AcceptSchoolRulesResponse,
  AcceptSchoolRulesVariables,
  UseAcceptSchoolRulesProps,
} from "./use-accept-school-rules.types";

const INVALID_TOKEN = "auth.token.invalid";
const OUTDATED_VERSION = "schoolRules.version.outdated";

/**
 * Records the acceptance of a school rules version and puts the returned account in the session, which opens the
 * role's home (spec 012, D-04). An outdated version reloads the rules; an expired access token can't be renewed
 * yet, so it signs out locally (D-09).
 */
export const useAcceptSchoolRules = ({
  onOutdated,
}: UseAcceptSchoolRulesProps = {}) => {
  const { t } = useTranslation();
  const { tokens, setSession } = useSession();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const { signOut } = useSignOut();

  return useMutation({
    retry: false,
    mutationFn: (variables: AcceptSchoolRulesVariables) =>
      apiPost<AcceptSchoolRulesResponse>(
        "/school-rules/acceptances",
        variables,
        { accessToken: tokens?.accessToken },
      ),
    onSuccess: (user) => {
      if (tokens) {
        setSession({ user, tokens });
      }
    },
    onError: (error) => {
      if (error instanceof NetworkError) {
        alertMessage.show(t("createAccount.errors.noConnection"));

        return;
      }

      const errorCode = error instanceof ApiError ? error.errors[0] : undefined;

      if (
        error instanceof ApiError &&
        error.status === 401 &&
        errorCode === INVALID_TOKEN
      ) {
        alertMessage.show(t("whatsapp.sessionExpired"));
        signOut();

        return;
      }

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
