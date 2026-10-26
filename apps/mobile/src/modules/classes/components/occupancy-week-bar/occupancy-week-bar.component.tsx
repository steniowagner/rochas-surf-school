import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { OccupancyWeekBarProps } from "./occupancy-week-bar.types";

/** The week the map shows, with how far it is from this one: all of it presses to open the calendar that picks another. */
export function OccupancyWeekBar({
  relativeLabel,
  isCurrentWeek,
  caption,
  onPress,
}: OccupancyWeekBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("weeklyOccupancy.openCalendar")}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 rounded-card border border-line bg-surface p-3"
    >
      <View className="flex-1">
        <Text
          testID="occupancy-week-label"
          numberOfLines={1}
          className={`ds-text-section-label ${isCurrentWeek ? "text-sun" : "text-ink-2"}`}
        >
          {relativeLabel}
        </Text>
        <Text numberOfLines={1} className="ds-text-day-number text-ink">
          {caption}
        </Text>
      </View>
      <View
        testID="occupancy-week-calendar-icon"
        className="h-11 w-11 items-center justify-center rounded-control bg-sun-tint"
      >
        <Ionicons name="calendar-outline" size={20} color={theme.ink} />
      </View>
    </TouchableOpacity>
  );
}
