import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { OccupancyWeekBarProps } from "./occupancy-week-bar.types";

/** The week the map shows, with how far it is from this one, between the arrows that move it by one week. */
export function OccupancyWeekBar({
  relativeLabel,
  isCurrentWeek,
  caption,
  onPrevious,
  onNext,
}: OccupancyWeekBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("weekMonthCalendar.previousWeek")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onPrevious}
      >
        <View
          testID="occupancy-week-arrow-previous"
          style={shadowStyle("iconButton", theme)}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={20} color={theme.ink} />
        </View>
      </TouchableOpacity>
      <View className="flex-1 items-center">
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
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("weekMonthCalendar.nextWeek")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onNext}
      >
        <View
          testID="occupancy-week-arrow-next"
          style={shadowStyle("iconButton", theme)}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-forward" size={20} color={theme.ink} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
