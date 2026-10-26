import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { useSchoolRuleSheet } from "./school-rule-sheet.hook";
import { SchoolRuleSheetProps } from "./school-rule-sheet.types";

/** "Nova regra" / "Editar regra": a title and an explanation; saving asks everyone to accept the rules again. */
export function SchoolRuleSheet({ visible, mode, rule, onClose, onDelete }: SchoolRuleSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sheet = useSchoolRuleSheet({ visible, mode, rule, onClose });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <Text className="ds-text-sheet-title text-ink">
          {sheet.editing
            ? t("manageSchoolRules.sheet.editTitle")
            : t("manageSchoolRules.sheet.addTitle")}
        </Text>
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="ds-text-list-subtitle px-1 text-ink-2">
              {t("manageSchoolRules.sheet.titleLabel")}
            </Text>
            <TextInput
              icon={null}
              accessibilityLabel={t("manageSchoolRules.sheet.titleLabel")}
              placeholder={t("manageSchoolRules.sheet.titlePlaceholder")}
              value={sheet.fields.title}
              maxLength={sheet.titleMaxLength}
              onChangeText={sheet.changeTitle}
            />
            <Text className="ds-text-list-subtitle px-1 text-right text-ink-2">
              {`${sheet.fields.title.length}/${sheet.titleMaxLength}`}
            </Text>
          </View>
          <TextArea
            inBottomSheet
            label={t("manageSchoolRules.sheet.descriptionLabel")}
            placeholder={t("manageSchoolRules.sheet.descriptionPlaceholder")}
            value={sheet.fields.description}
            maxLength={sheet.descriptionMaxLength}
            onChangeText={sheet.changeDescription}
          />
        </View>
        <View className="flex-row gap-2 rounded-control bg-sand p-3">
          <Ionicons name="information-circle-outline" size={18} color={theme.ink2} />
          <Text className="ds-text-list-subtitle flex-1 text-ink-2">
            {t("manageSchoolRules.sheet.saveNote")}
          </Text>
        </View>
        <Button
          variant="primary"
          loading={sheet.loading}
          disabled={!sheet.canSubmit}
          onPress={sheet.submit}
        >
          {sheet.editing ? t("manageSchoolRules.sheet.save") : t("manageSchoolRules.sheet.add")}
        </Button>
        {sheet.editing ? (
          <Button variant="outline" onPress={() => onDelete(rule!)}>
            {t("manageSchoolRules.sheet.delete")}
          </Button>
        ) : null}
        <Button variant="ghost" onPress={onClose}>
          {t("manageSchoolRules.sheet.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
