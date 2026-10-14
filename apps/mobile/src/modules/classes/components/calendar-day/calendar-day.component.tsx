import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { CalendarDayProps } from "./calendar-day.types";

export function CalendarDay({
  date,
  disabled,
  today,
  edge,
  inRange,
  excluded,
  accessibilityLabel,
  onPress,
}: CalendarDayProps) {
  const labelColor = edge ? "text-on-color" : disabled ? "text-ink-3" : "text-ink";

  return (
    <TouchableOpacity
      testID={`calendar-day-${date}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: edge || inRange }}
      disabled={disabled}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={() => onPress(date)}
      className={`h-11 flex-1 items-center justify-center ${inRange ? "bg-info-tint" : ""}`}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          edge ? "bg-grape" : ""
        } ${today ? "border-2 border-sun" : ""}`}
      >
        <Text
          className={`ds-text-list-title ${labelColor} ${excluded ? "line-through" : ""}`}
        >
          {Number(date.slice(8, 10))}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
