import { openBrowserAsync } from "expo-web-browser";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

/** Opens an address in the in-app browser; a rejected open shows the generic toast. */
export const useOpenUrl = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();

  return async (url: string) => {
    try {
      await openBrowserAsync(url);
    } catch {
      alertMessage.show(t("createAccount.errors.generic"));
    }
  };
};
