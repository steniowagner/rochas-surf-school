import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { CalendarDayProps } from "./calendar-day.types";

export function CalendarDay({
  date,
  disabled,
  adjacentMonth,
  today,
  edge,
  inRange,
  bandStart,
  bandEnd,
  excluded,
  accessibilityLabel,
  onPress,
}: CalendarDayProps) {
  const labelColor = edge
    ? "text-on-color"
    : disabled || excluded
      ? "text-ink-3"
      : adjacentMonth
        ? "text-ink-2 opacity-60"
        : "text-ink";

  return (
    <TouchableOpacity
      testID={`calendar-day-${date}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled,
        selected: (edge || inRange) && !excluded,
      }}
      disabled={disabled}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={() => onPress(date)}
      className="h-11 flex-1"
    >
      <View
        testID={`calendar-day-band-${date}`}
        className={`h-11 items-center justify-center ${inRange ? "bg-grape-tint" : ""} ${
          inRange && bandStart ? "rounded-l-full" : ""
        } ${inRange && bandEnd ? "rounded-r-full" : ""}`}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            edge ? "bg-grape" : ""
          } ${today ? "border-2 border-grape" : ""}`}
        >
          <Text
            className={`ds-text-list-title ${labelColor} ${excluded ? "line-through" : ""}`}
          >
            {Number(date.slice(8, 10))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
