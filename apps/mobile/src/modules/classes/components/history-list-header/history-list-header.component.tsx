import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import type { HistoryListHeaderProps } from "./history-list-header.types";

/** Above the history's classes: the title at the left, and the period's caption or the selected day's chip at the right. */
export function HistoryListHeader({
  title,
  caption,
  dayLabel,
  clearDayLabel,
  onClearDay,
}: HistoryListHeaderProps) {
  const theme = useTheme();

  return (
    <View className="min-h-11 flex-row items-center justify-between gap-3">
      <Text accessibilityRole="header" className="ds-text-section-label text-ink-2">
        {title}
      </Text>
      {dayLabel === null ? (
        <Text numberOfLines={1} className="ds-text-chip shrink text-ink-2">
          {caption}
        </Text>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={clearDayLabel}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={onClearDay}
        >
          {/* The chip is drawn at the design's size; the target around it makes up the 44 pt. */}
          <View testID="history-day-chip-target" className="min-h-11 min-w-11 justify-center">
            <View
              testID="history-day-chip"
              className="flex-row items-center gap-1 rounded-full bg-info-tint px-2.5 py-1"
            >
              <Text className="ds-text-chip text-lagoon">{dayLabel}</Text>
              <Ionicons name="close" size={13} color={theme.lagoon} />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
