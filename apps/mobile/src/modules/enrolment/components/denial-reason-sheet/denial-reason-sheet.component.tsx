import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import type { DenialReasonSheetProps } from "./denial-reason-sheet.types";

/** Shows the reason the school gave for denying a request, as written. */
export function DenialReasonSheet({
  visible,
  discipline,
  level,
  start,
  reason,
  onClose,
}: DenialReasonSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">{t("enrolment.denialSheet.title")}</Text>
          <Text className="ds-text-body text-ink-2">
            {`${t(`newClass.discipline.${discipline}`)} · ${t(`newClass.level.${level}`)} · ${start}`}
          </Text>
        </View>
        <View className="gap-1 rounded-card bg-dim p-4">
          <Text className="ds-text-section-label text-ink-2">{t("enrolment.denialSheet.label")}</Text>
          <Text className="ds-text-body text-ink">{reason ?? t("enrolment.denialSheet.noReason")}</Text>
        </View>
        <Button variant="subtle" onPress={onClose}>
          {t("enrolment.denialSheet.close")}
        </Button>
      </View>
    </BottomModal>
  );
}
