import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { useCalendarWeekRow } from "./calendar-week-row.hook";
import type { CalendarWeekRowProps } from "./calendar-week-row.types";

/** The seven days of a week in a row: only the selected day has a background, and a day with classes has one dot. */
export function CalendarWeekRow({
  onSelectDate,
  ...props
}: CalendarWeekRowProps) {
  const { weekDays } = useCalendarWeekRow(props);

  return (
    <View className="flex-row gap-1">
      {weekDays.map((day) => {
        const number = day.selected
          ? "text-on-color"
          : day.today
            ? "text-sun"
            : "text-ink";

        return (
          <TouchableOpacity
            key={day.date}
            testID={`calendar-day-${day.date}`}
            accessibilityRole="button"
            accessibilityLabel={day.accessibilityLabel}
            accessibilityState={{ selected: day.selected }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={() => onSelectDate(day.date)}
            className="flex-1"
          >
            <View
              testID={`calendar-day-${day.date}-background`}
              className={`items-center justify-center gap-1 rounded-control py-2 ${day.selected ? "bg-grape" : ""}`}
            >
              <Text
                className={`ds-text-chip ${day.selected ? "text-on-color" : "text-ink-2"}`}
              >
                {day.weekday}
              </Text>
              <Text className={`ds-text-calendar-day ${number}`}>
                {day.number}
              </Text>
              <View className="h-1">
                {day.marked ? (
                  <View
                    testID={`calendar-day-${day.date}-dot`}
                    className={`h-1 w-1 rounded-full ${day.selected ? "bg-on-color" : "bg-lagoon"}`}
                  />
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
