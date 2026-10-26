import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import { SendNoticeConfirmSheetProps } from "./send-notice-confirm-sheet.types";

/** The final check before a notice goes out: who receives it and how many people they are. */
export function SendNoticeConfirmSheet({
  visible,
  audience,
  count,
  sending,
  onConfirm,
  onClose,
}: SendNoticeConfirmSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <Text accessibilityRole="header" className="ds-text-screen-title text-ink">
          {t("notices.confirm.title")}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t("notices.confirm.description", {
            count,
            audience: t(`notices.audience.${audience}`),
          })}
        </Text>
        <View className="gap-2">
          <Button loading={sending} onPress={onConfirm}>
            {t("notices.confirm.send")}
          </Button>
          <Button variant="subtle" disabled={sending} onPress={onClose}>
            {t("notices.confirm.cancel")}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
