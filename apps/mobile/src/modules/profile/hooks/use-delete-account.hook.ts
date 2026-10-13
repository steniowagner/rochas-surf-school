import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { apiDelete, NetworkError, SessionExpiredError } from "@/services/api";

/**
 * Closes the account on the backend, then signs out on this phone. Errors show in the toast, except an expired
 * session, which is handled once for the whole app.
 */
export const useDeleteAccount = () => {
  const { t } = useTranslation();
  const { signOut } = useSignOut();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: () => apiDelete<void>("/auth/me", {}, { authenticated: true }),
    onSuccess: () => signOut(),
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
