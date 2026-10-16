import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import type { WeekNavProps } from "./week-nav.types";

export function WeekNav({
  caption,
  showToday,
  onPrevious,
  onNext,
  onToday,
}: WeekNavProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("classesWeek.previousWeek")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onPrevious}
        className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
      >
        <Ionicons name="chevron-back" size={20} color={theme.ink} />
      </TouchableOpacity>
      <Text className="ds-text-list-title flex-1 text-center text-ink">
        {caption}
      </Text>
      {showToday ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onToday}
          className="min-h-11 justify-center rounded-full bg-grape-tint px-4"
        >
          <Text className="ds-text-button text-grape">
            {t("classesWeek.today")}
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("classesWeek.nextWeek")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onNext}
        className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface"
      >
        <Ionicons name="chevron-forward" size={20} color={theme.ink} />
      </TouchableOpacity>
    </View>
  );
}
