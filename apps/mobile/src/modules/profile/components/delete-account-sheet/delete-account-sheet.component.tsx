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
  const { confirm, close, goToPeople, isDeleting, isOnlyAdmin } =
    useDeleteAccountSheet({ visible, onClose });

  return (
    <BottomModal visible={visible} onClose={close}>
      <View className="mb-4 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">
          {t(
            isOnlyAdmin
              ? "deleteAccountSheet.onlyAdmin.title"
              : "deleteAccountSheet.title",
          )}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t(
            isOnlyAdmin
              ? "deleteAccountSheet.onlyAdmin.description"
              : "deleteAccountSheet.description",
          )}
        </Text>
      </View>

      <View className="gap-2.5">
        {isOnlyAdmin ? (
          <Button
            icon={
              <Ionicons name="people-outline" size={20} color={theme.onColor} />
            }
            onPress={goToPeople}
          >
            {t("deleteAccountSheet.onlyAdmin.goToPeople")}
          </Button>
        ) : (
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
        )}
        <Button variant="ghost" onPress={close}>
          {t("deleteAccountSheet.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
