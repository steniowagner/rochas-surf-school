import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useClassToolsSheet } from "./class-tools-sheet.hook";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

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
          <Button
            icon={<Ionicons name="pencil-outline" size={20} color={theme.onColor} />}
            onPress={edit}
          >
            {t("classTools.edit")}
          </Button>
          {/* Placeholder: sending a message to the class's people comes with its own spec. */}
          <Button
            icon={<Ionicons name="megaphone-outline" size={20} color={theme.onColor} />}
          >
            {t("classTools.notify")}
          </Button>
          <Button
            icon={<Ionicons name="close-circle-outline" size={20} color={theme.onColor} />}
            onPress={cancel}
          >
            {t("classTools.cancel")}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
