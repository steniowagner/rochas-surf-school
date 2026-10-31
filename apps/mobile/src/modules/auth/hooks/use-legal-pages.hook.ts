import { useTranslation } from "react-i18next";

import type { AppLocale } from "@/i18n/locales";
import { useOpenUrl } from "@/modules/profile/hooks/use-open-url.hook";
import {
  getWebPageUrl,
  type WebPage,
} from "@/modules/profile/utils/web-pages";
import { useAlertMessage } from "@/providers/alert-message";

/** Opens the pages named in the terms sentence, in the app's language. */
export const useLegalPages = () => {
  const { t, i18n } = useTranslation();
  const alertMessage = useAlertMessage();
  const openUrl = useOpenUrl();

  const openPage = (page: WebPage) => {
    const url = getWebPageUrl(page, i18n.language as AppLocale);

    // The sentence is always shown, so without the web address the press still answers.
    if (url) {
      void openUrl(url);
    } else {
      alertMessage.show(t("createAccount.errors.generic"));
    }
  };

  return {
    onTermsPress: () => openPage("terms-of-use"),
    onPrivacyPress: () => openPage("privacy-policy"),
  };
};
