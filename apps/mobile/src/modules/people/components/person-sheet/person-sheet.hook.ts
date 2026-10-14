import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { formatWhatsappNumber } from "../../utils/format-whatsapp-number";

import { UsePersonSheetProps } from "./person-sheet.types";

export const usePersonSheet = ({ person }: UsePersonSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const number = person?.whatsappNumber ?? null;

  const openChat = async () => {
    try {
      await Linking.openURL(`https://wa.me/${number?.replace("+", "")}`);
    } catch {
      alertMessage.show(t("people.whatsappUnavailable"));
    }
  };

  return {
    formattedNumber: number ? formatWhatsappNumber(number) : null,
    openChat,
  };
};
