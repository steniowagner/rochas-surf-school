import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import type { CancelSeatSheetProps } from "./cancel-seat-sheet.types";

/** Asks before an approved seat is given up, with the deadline it can be cancelled until. */
export function CancelSeatSheet({
  visible,
  loading,
  deadline,
  onConfirm,
  onClose,
}: CancelSeatSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">{t("enrolment.cancelSeatSheet.title")}</Text>
          <Text className="ds-text-body text-ink-2">
            {t("enrolment.cancelSeatSheet.description", { deadline })}
          </Text>
        </View>
        <Button variant="danger" loading={loading} onPress={onConfirm}>
          {t("enrolment.cancelSeatSheet.confirm")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("enrolment.cancelSeatSheet.keep")}
        </Button>
      </View>
    </BottomModal>
  );
}
