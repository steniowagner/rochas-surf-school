import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import { useClassToolsSheet } from "./class-tools-sheet.hook";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

export function ClassToolsSheet({
  visible,
  onClose,
  onEdit,
  onCancel,
}: ClassToolsSheetProps) {
  const { t } = useTranslation();
  const { edit, cancel } = useClassToolsSheet({ onClose, onEdit, onCancel });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <Text className="ds-text-sheet-title text-ink">
          {t("classTools.title")}
        </Text>
        <View className="gap-2">
          <Button variant="outline" onPress={edit}>
            {t("classTools.edit")}
          </Button>
          {/* Placeholder: sending a message to the class's people comes with its own spec. */}
          <Button variant="outline">{t("classTools.notify")}</Button>
          <Button variant="danger" onPress={cancel}>
            {t("classTools.cancel")}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
