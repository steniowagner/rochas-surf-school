import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { apiPost, ApiError, NetworkError } from "@/services/api";

import { RequestReactivationResponse } from "./use-request-reactivation.types";

const INVALID_TOKEN = "auth.token.invalid";
const NOT_DELETED = "user.status.notDeleted";
const REACTIVATION_DENIED = "user.reactivation.denied";

/**
 * Sends the deleted account's one reactivation request and puts the answer in the session, so the screen shows the
 * state that matches the account. Errors show in the toast; an expired access token can't be renewed yet, so it
 * signs out locally (spec 016, D-04).
 */
export const useRequestReactivation = () => {
  const { t } = useTranslation();
  const { user, tokens, setSession } = useSession();
  const alertMessage = useAlertMessage();
  const { signOut } = useSignOut();

  return useMutation({
    retry: false,
    mutationFn: () =>
      apiPost<RequestReactivationResponse>(
        "/auth/me/reactivation-request",
        {},
        { accessToken: tokens?.accessToken },
      ),
    onSuccess: (account) => {
      if (tokens) {
        setSession({ user: account, tokens });
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
        error.status === 409 &&
        errorCode === REACTIVATION_DENIED &&
        user &&
        tokens
      ) {
        setSession({ user: { ...user, reactivationStatus: "denied" }, tokens });

        return;
      }

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
        error.status === 403 &&
        errorCode === NOT_DELETED
      ) {
        alertMessage.show(t("reactivation.accountChanged"));
        signOut();

        return;
      }

      alertMessage.show(t("createAccount.errors.generic"));
    },
  });
};
