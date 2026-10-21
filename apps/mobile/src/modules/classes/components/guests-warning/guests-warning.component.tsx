import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import type { GuestsWarningProps } from "./guests-warning.types";

/** Tells an admin that the trial guests of a class have no account, so they won't hear about an edit or a cancellation. */
export function GuestsWarning({ count }: GuestsWarningProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (count === 0) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-3 rounded-card bg-warn-tint p-4">
      <Ionicons name="alert-circle-outline" size={20} color={theme.ink} />
      <Text className="ds-text-list-subtitle flex-1 text-ink">
        {t("classDetails.guestsWarning", { count })}
      </Text>
    </View>
  );
}
