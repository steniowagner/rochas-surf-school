import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useDeleteAccountSheet } from "./delete-account-sheet.hook";
import { DeleteAccountSheetProps } from "./delete-account-sheet.types";

export function DeleteAccountSheet({
  visible,
  onClose,
}: DeleteAccountSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { confirm, isDeleting } = useDeleteAccountSheet({ onClose });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-4 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">
          {t("deleteAccountSheet.title")}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t("deleteAccountSheet.description")}
        </Text>
      </View>

      <View className="gap-2.5">
        <Button
          variant="danger"
          loading={isDeleting}
          icon={
            <Ionicons name="trash-outline" size={20} color={theme.onColor} />
          }
          onPress={confirm}
        >
          {t("deleteAccountSheet.confirm")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("deleteAccountSheet.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
