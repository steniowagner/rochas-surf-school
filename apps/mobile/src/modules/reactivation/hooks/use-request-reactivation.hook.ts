import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import {
  apiPost,
  ApiError,
  NetworkError,
  SessionExpiredError,
} from "@/services/api";

import { RequestReactivationResponse } from "./use-request-reactivation.types";

const NOT_DELETED = "user.status.notDeleted";
const REACTIVATION_DENIED = "user.reactivation.denied";

/**
 * Sends the deleted account's one reactivation request and puts the answer in the session, so the screen shows the
 * state that matches the account. Errors show in the toast, except an expired session, which is handled once for
 * the whole app (spec 016, D-04; spec 018, D-08).
 */
export const useRequestReactivation = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useSession();
  const alertMessage = useAlertMessage();
  const { signOut } = useSignOut();

  return useMutation({
    retry: false,
    mutationFn: () =>
      apiPost<RequestReactivationResponse>(
        "/auth/me/reactivation-request",
        {},
        { authenticated: true },
      ),
    onSuccess: (account) => updateUser(account),
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      if (error instanceof NetworkError) {
        alertMessage.show(t("createAccount.errors.noConnection"));

        return;
      }

      const status = error instanceof ApiError ? error.status : undefined;
      const errorCode = error instanceof ApiError ? error.errors[0] : undefined;

      if (status === 409 && errorCode === REACTIVATION_DENIED && user) {
        updateUser({ ...user, reactivationStatus: "denied" });

        return;
      }

      if (status === 403 && errorCode === NOT_DELETED) {
        alertMessage.show(t("reactivation.accountChanged"));
        signOut();

        return;
      }

      alertMessage.show(t("createAccount.errors.generic"));
    },
  });
};
