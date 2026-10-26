import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useDeleteSchoolRuleSheet } from "./delete-school-rule-sheet.hook";
import { DeleteSchoolRuleSheetProps } from "./delete-school-rule-sheet.types";

/** "Excluir esta regra?": the second step before a rule is gone for good and everyone accepts the rules again. */
export function DeleteSchoolRuleSheet({
  visible,
  rule,
  onClose,
}: DeleteSchoolRuleSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useDeleteSchoolRuleSheet({ rule, onClose });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">
            {t("manageSchoolRules.deleteSheet.title")}
          </Text>
          <Text className="ds-text-list-title text-ink">{rule?.title}</Text>
        </View>
        <View className="flex-row gap-2 rounded-control bg-sand p-3">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={theme.ink2}
          />
          <Text className="ds-text-list-subtitle flex-1 text-ink-2">
            {t("manageSchoolRules.deleteSheet.note")}
          </Text>
        </View>
        <Button
          variant="danger"
          loading={sheet.loading}
          onPress={sheet.confirm}
        >
          {t("manageSchoolRules.sheet.delete")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("manageSchoolRules.sheet.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
