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

import {
  SaveWhatsappResponse,
  SaveWhatsappVariables,
} from "./use-save-whatsapp.types";

const INVALID_NUMBER_ERRORS = [
  "user.whatsappNumber.required",
  "user.whatsappNumber.phone",
];

/**
 * Saves the account's WhatsApp number and visibility and puts the returned user in the session. Errors show in the
 * toast, except an expired session, which is handled once for the whole app (spec 008, D-09, D-10; spec 018, D-08).
 */
export const useSaveWhatsapp = () => {
  const { t } = useTranslation();
  const { updateUser } = useSession();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: (variables: SaveWhatsappVariables) =>
      apiPut<SaveWhatsappResponse>("/auth/me/whatsapp", variables, {
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

      const errorCode = error instanceof ApiError ? error.errors[0] : undefined;

      alertMessage.show(
        errorCode && INVALID_NUMBER_ERRORS.includes(errorCode)
          ? t("whatsapp.invalidNumber")
          : t("createAccount.errors.generic"),
      );
    },
  });
};
