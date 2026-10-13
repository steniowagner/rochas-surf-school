import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import {
  apiPut,
  ApiError,
  NetworkError,
  SessionExpiredError,
} from "@/services/api";

import type {
  UpdateNameResponse,
  UpdateNameVariables,
} from "./use-update-name.types";

/**
 * Changes the account's name and puts the returned account in the session. Errors show in the toast, except an
 * expired session, which is handled once for the whole app (spec 026, D-06).
 */
export const useUpdateName = () => {
  const { t } = useTranslation();
  const { updateUser } = useSession();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: (variables: UpdateNameVariables) =>
      apiPut<UpdateNameResponse>("/auth/me/name", variables, {
        authenticated: true,
      }),
    onSuccess: (user) => updateUser(user),
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      if (error instanceof NetworkError) {
        alertMessage.show(t("createAccount.errors.noConnection"));

        return;
      }

      const isNameError =
        error instanceof ApiError &&
        error.status === 422 &&
        error.errors.some((code) => code.startsWith("user.name."));

      alertMessage.show(
        isNameError
          ? t("createAccount.nameInvalid")
          : t("createAccount.errors.generic"),
      );
    },
  });
};
