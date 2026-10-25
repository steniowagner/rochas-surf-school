import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import { OccupancyWeekBarProps } from "./occupancy-week-bar.types";

// The arrows are drawn at the design's size, smaller than a touch target: this makes up the 44 pt.
const ARROW_HIT_SLOP = 4;

/** The week the map shows between the arrows that move it by one week. */
export function OccupancyWeekBar({
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
        hitSlop={ARROW_HIT_SLOP}
        className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
      >
        <Ionicons name="chevron-back" size={18} color={theme.ink} />
      </TouchableOpacity>
      <Text
        numberOfLines={1}
        className="ds-text-pill flex-1 text-center text-ink"
      >
        {caption}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("weekMonthCalendar.nextWeek")}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onNext}
        hitSlop={ARROW_HIT_SLOP}
        className="h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
      >
        <Ionicons name="chevron-forward" size={18} color={theme.ink} />
      </TouchableOpacity>
    </View>
  );
}
