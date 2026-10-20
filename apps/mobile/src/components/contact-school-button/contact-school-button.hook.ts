import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useSchoolWhatsapp } from "@/hooks/use-school-whatsapp.hook";
import { useAlertMessage } from "@/providers/alert-message";

import { UseContactSchoolButtonResult } from "./contact-school-button.types";

export const useContactSchoolButton = (): UseContactSchoolButtonResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const whatsappNumber = useSchoolWhatsapp();

  const openChat = async () => {
    try {
      await Linking.openURL(
        `https://wa.me/${whatsappNumber?.replace("+", "")}`,
      );
    } catch {
      alertMessage.show(t("closedAccount.whatsappUnavailable"));
    }
  };

  return { hasNumber: whatsappNumber !== null, openChat };
};
