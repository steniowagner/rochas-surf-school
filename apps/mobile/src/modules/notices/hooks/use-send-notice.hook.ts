import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { apiPost, NetworkError, SessionExpiredError } from "@/services/api";

import { SendNoticeVariables } from "../notices.types";

/**
 * Sends the notice. A failure shows in the toast, except an expired session, which is handled once for the whole app;
 * the caller keeps the text it typed.
 */
export const useSendNotice = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: (variables: SendNoticeVariables) =>
      apiPost<void>("/notifications/broadcast", variables, {
        authenticated: true,
      }),
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      alertMessage.show(
        error instanceof NetworkError
          ? t("createAccount.errors.noConnection")
          : t("notices.sendError"),
      );
    },
  });
};
