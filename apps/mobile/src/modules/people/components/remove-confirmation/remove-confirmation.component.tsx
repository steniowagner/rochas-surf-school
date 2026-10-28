import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

import { RemoveConfirmationProps } from "./remove-confirmation.types";

export function RemoveConfirmation({
  role,
  name,
  loading,
  onConfirm,
  onBack,
}: RemoveConfirmationProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="ds-text-sheet-title text-ink">
          {t("people.removeConfirm.title", { name })}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t(role === "student" ? "people.removeConfirm.student" : "people.removeConfirm.staff")}
        </Text>
      </View>
      <View className="gap-2">
        <Button variant="danger" loading={loading} onPress={onConfirm}>
          {t("people.removeConfirm.confirm")}
        </Button>
        <Button variant="ghost" disabled={loading} onPress={onBack}>
          {t("people.removeConfirm.back")}
        </Button>
      </View>
    </View>
  );
}
