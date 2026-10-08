import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { BackButtonProps } from "./back-button.types";

const goBack = () => router.back();

export function BackButton({ onPress = goBack }: BackButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
    >
      <Ionicons name="chevron-back" size={22} color={theme.ink} />
    </TouchableOpacity>
  );
}
