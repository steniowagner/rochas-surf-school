import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import type { WithdrawRequestSheetProps } from "./withdraw-request-sheet.types";

/** Asks before a pending request is withdrawn. */
export function WithdrawRequestSheet({
  visible,
  loading,
  onConfirm,
  onClose,
}: WithdrawRequestSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">{t("enrolment.withdrawSheet.title")}</Text>
          <Text className="ds-text-body text-ink-2">{t("enrolment.withdrawSheet.description")}</Text>
        </View>
        <Button variant="danger" loading={loading} onPress={onConfirm}>
          {t("enrolment.withdrawSheet.confirm")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("enrolment.withdrawSheet.keep")}
        </Button>
      </View>
    </BottomModal>
  );
}
