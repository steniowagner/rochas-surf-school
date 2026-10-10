import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { apiPut, ApiError, NetworkError } from "@/services/api";

import {
  SaveWhatsappResponse,
  SaveWhatsappVariables,
} from "./use-save-whatsapp.types";

const INVALID_TOKEN = "auth.token.invalid";
const INVALID_NUMBER_ERRORS = [
  "user.whatsappNumber.required",
  "user.whatsappNumber.phone",
];

/**
 * Saves the account's WhatsApp number and visibility and puts the returned user in the session. Errors show in the
 * toast; an expired access token can't be renewed yet, so it signs out locally (spec 008, D-09, D-10).
 */
export const useSaveWhatsapp = () => {
  const { t } = useTranslation();
  const { tokens, setSession } = useSession();
  const alertMessage = useAlertMessage();
  const { signOut } = useSignOut();

  return useMutation({
    retry: false,
    mutationFn: (variables: SaveWhatsappVariables) =>
      apiPut<SaveWhatsappResponse>("/auth/me/whatsapp", variables, {
        accessToken: tokens?.accessToken,
      }),
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

      if (error instanceof ApiError && error.status === 401 && errorCode === INVALID_TOKEN) {
        alertMessage.show(t("whatsapp.sessionExpired"));
        signOut();

        return;
      }

      alertMessage.show(
        errorCode && INVALID_NUMBER_ERRORS.includes(errorCode)
          ? t("whatsapp.invalidNumber")
          : t("createAccount.errors.generic"),
      );
    },
  });
};
