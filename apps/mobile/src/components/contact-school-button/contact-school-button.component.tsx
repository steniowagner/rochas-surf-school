import { FontAwesome } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useContactSchoolButton } from "./contact-school-button.hook";

export function ContactSchoolButton() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { hasNumber, openChat } = useContactSchoolButton();

  if (!hasNumber) {
    return null;
  }

  return (
    <Button
      icon={<FontAwesome name="whatsapp" size={20} color={theme.onColor} />}
      onPress={openChat}
    >
      {t("closedAccount.contactSchool")}
    </Button>
  );
}
