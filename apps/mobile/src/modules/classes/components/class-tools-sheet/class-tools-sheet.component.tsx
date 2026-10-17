import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { useClassToolsSheet } from "./class-tools-sheet.hook";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

const ROW =
  "min-h-11 flex-row items-center gap-3 rounded-control border border-line bg-surface px-3 py-2.5";

export function ClassToolsSheet({
  visible,
  onClose,
  onEdit,
  onCancel,
}: ClassToolsSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { edit, cancel } = useClassToolsSheet({ onClose, onEdit, onCancel });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <Text className="ds-text-sheet-title text-ink">{t("classTools.title")}</Text>
        <View className="gap-2">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("classTools.edit")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={edit}
            className={ROW}
          >
            <Ionicons name="pencil-outline" size={20} color={theme.ink} />
            <Text className="ds-text-list-title flex-1 text-ink">{t("classTools.edit")}</Text>
          </TouchableOpacity>
          {/* Placeholder: sending a message to the class's people comes with its own spec. */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("classTools.notify")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            className={ROW}
          >
            <Ionicons name="megaphone-outline" size={20} color={theme.ink} />
            <Text className="ds-text-list-title flex-1 text-ink">{t("classTools.notify")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("classTools.cancel")}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={cancel}
            className={ROW}
          >
            <Ionicons name="close-circle-outline" size={20} color={theme.bad} />
            <Text className="ds-text-list-title flex-1 text-bad">{t("classTools.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomModal>
  );
}
