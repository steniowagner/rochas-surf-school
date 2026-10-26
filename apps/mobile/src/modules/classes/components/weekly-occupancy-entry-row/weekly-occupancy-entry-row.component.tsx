import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { entryRowContainerClassName } from "@/utils/entry-row-container";

import type { WeeklyOccupancyEntryRowProps } from "./weekly-occupancy-entry-row.types";

/** The "Ocupação semanal" row of the admin's and the instructor's home, in a card of its own. */
export function WeeklyOccupancyEntryRow({
  grouped,
  onPress,
}: WeeklyOccupancyEntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className={entryRowContainerClassName(grouped)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("weeklyOccupancy.title")}
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <Ionicons name="bar-chart-outline" size={20} color={theme.lagoon} />
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-list-title text-ink">
            {t("weeklyOccupancy.title")}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("weeklyOccupancy.rowSubtitle")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
      </Pressable>
    </View>
  );
}
