import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { ClassSummaryCard } from "@/modules/classes/components/class-summary-card";

import { SendNoticeConfirmSheetProps } from "./send-notice-confirm-sheet.types";

/**
 * The final check before a notice or a class message goes out (PAINEL-07A): how many people receive it, who they
 * are, and the text itself. The preview scrolls when the message is long; the gesture handler's scroll view keeps the sheet's own drag.
 */
export function SendNoticeConfirmSheet({
  visible,
  classSummary = null,
  description,
  count,
  title,
  message,
  sending,
  onConfirm,
  onClose,
}: SendNoticeConfirmSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View>
        <Text accessibilityRole="header" className="ds-text-sheet-title text-ink">
          {t("notices.confirm.title", { count })}
        </Text>
        {classSummary ? (
          <View className="mt-3">
            <ClassSummaryCard {...classSummary} />
          </View>
        ) : null}
        <Text className="ds-text-sheet-description mt-2.5 text-ink-2">
          {description}
        </Text>
        <ScrollView
          testID="notice-preview"
          className="mt-3.5 max-h-[180px] rounded-control border border-line bg-surface"
          contentContainerClassName="px-[15px] py-[13px]"
        >
          <Text className="ds-text-preview-title text-ink">{title}</Text>
          <Text className="ds-text-preview-body mt-1 text-ink-2">{message}</Text>
        </ScrollView>
        <View className="mt-3.5 gap-2.5">
          <Button loading={sending} onPress={onConfirm}>
            {t("notices.confirm.send")}
          </Button>
          <Button variant="ghost" disabled={sending} onPress={onClose}>
            {t("notices.confirm.cancel")}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
