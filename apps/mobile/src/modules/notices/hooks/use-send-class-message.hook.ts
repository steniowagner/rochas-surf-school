import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  isClassCancelledError,
  isClassFinishedError,
  isClassNotFoundError,
} from "@/modules/classes/utils/class-error";
import { useAlertMessage } from "@/providers/alert-message";
import { apiPost, NetworkError, SessionExpiredError } from "@/services/api";

import { SendClassMessageVariables } from "../notices.types";

const errorKeyOf = (error: unknown): string => {
  if (isClassFinishedError(error)) {
    return "notices.classMessage.errors.finished";
  }

  if (isClassCancelledError(error)) {
    return "notices.classMessage.errors.cancelled";
  }

  if (isClassNotFoundError(error)) {
    return "classDetails.notFound";
  }

  return error instanceof NetworkError
    ? "createAccount.errors.noConnection"
    : "notices.classMessage.sendError";
};

/**
 * Sends an admin's message to one class (spec 069). A failure shows in the toast, except an expired session, which is
 * handled once for the whole app; the caller keeps the text it typed. Never retried: a message can't be taken back.
 */
export const useSendClassMessage = (classId: string) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: (variables: SendClassMessageVariables) =>
      apiPost<void>(`/classes/${classId}/message`, variables, {
        authenticated: true,
      }),
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      alertMessage.show(t(errorKeyOf(error)));
    },
  });
};
