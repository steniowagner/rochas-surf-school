import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useSignOutSheet } from "./sign-out-sheet.hook";
import { SignOutSheetProps } from "./sign-out-sheet.types";

export function SignOutSheet({ visible, onClose }: SignOutSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { confirm } = useSignOutSheet({ onClose });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-4 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">
          {t("signOutSheet.title")}
        </Text>
        <Text className="ds-text-body text-ink-2">
          {t("signOutSheet.description")}
        </Text>
      </View>

      <View className="gap-2.5">
        <Button
          variant="danger"
          icon={
            <Ionicons name="log-out-outline" size={20} color={theme.onColor} />
          }
          onPress={confirm}
        >
          {t("signOutSheet.confirm")}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {t("signOutSheet.cancel")}
        </Button>
      </View>
    </BottomModal>
  );
}
