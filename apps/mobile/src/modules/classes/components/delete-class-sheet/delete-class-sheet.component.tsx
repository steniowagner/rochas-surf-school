import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import type { DeleteClassSheetProps } from "./delete-class-sheet.types";

export function DeleteClassSheet({
  visible,
  variant,
  classLine,
  loading,
  onConfirm,
  onCancelInstead,
  onClose,
}: DeleteClassSheetProps) {
  const { t } = useTranslation();
  const notEmpty = variant === "notEmpty";

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">
            {notEmpty ? t("deleteClass.notEmpty.title") : t("deleteClass.title")}
          </Text>
          <Text className="ds-text-list-title text-ink">{classLine}</Text>
          <Text className="ds-text-body text-ink-2">
            {notEmpty
              ? t("deleteClass.notEmpty.description")
              : t("deleteClass.description")}
          </Text>
        </View>
        {notEmpty ? (
          <Button variant="danger" onPress={onCancelInstead}>
            {t("classTools.cancel")}
          </Button>
        ) : (
          <Button variant="danger" loading={loading} onPress={onConfirm}>
            {t("deleteClass.confirm")}
          </Button>
        )}
        <Button variant="ghost" onPress={onClose}>
          {t("cancelClass.keep")}
        </Button>
      </View>
    </BottomModal>
  );
}
