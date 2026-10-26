import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";

import { ClassToolCard } from "../class-tool-card";

import { useClassToolsSheet } from "./class-tools-sheet.hook";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

export function ClassToolsSheet({
  visible,
  onClose,
  onEdit,
  onNotify,
  onCancel,
  onDelete,
  messageCount,
  deleteState,
}: ClassToolsSheetProps) {
  const { t } = useTranslation();
  const {
    edit,
    notify,
    cancel,
    remove,
    messageSubtitle,
    cancelSubtitle,
    deleteSubtitle,
    canDelete,
  } = useClassToolsSheet({
    onClose,
    onEdit,
    onNotify,
    onCancel,
    onDelete,
    messageCount,
    deleteState,
  });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <Text className="ds-text-sheet-title text-ink">
          {t("classTools.title")}
        </Text>
        <View className="gap-2">
          <View className="flex-row gap-2">
            <ClassToolCard
              icon="pencil-outline"
              title={t("classTools.edit")}
              subtitle={t("classTools.editHint")}
              onPress={edit}
            />
            <ClassToolCard
              icon="chatbubble-outline"
              title={t("classTools.notify")}
              subtitle={messageSubtitle}
              onPress={notify}
            />
          </View>
          <View className="flex-row gap-2">
            <ClassToolCard
              icon="close-circle-outline"
              title={t("classTools.cancel")}
              subtitle={cancelSubtitle}
              tone="danger"
              onPress={cancel}
            />
            <ClassToolCard
              icon="trash-outline"
              title={t("classTools.delete")}
              subtitle={deleteSubtitle}
              disabled={!canDelete}
              onPress={remove}
            />
          </View>
        </View>
      </View>
    </BottomModal>
  );
}
