import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { useCalendarMonthGrid } from "./calendar-month-grid.hook";
import type { CalendarMonthGridProps } from "./calendar-month-grid.types";

/** A month, Monday first, with only the weeks it needs: the selected day in a circle, dots (1 to 3) under each day with classes. */
export function CalendarMonthGrid({ onSelectDate, ...props }: CalendarMonthGridProps) {
  const { initials, weeks } = useCalendarMonthGrid(props);

  return (
    <View className="gap-1">
      <View className="flex-row">
        {initials.map((initial, index) => (
          <Text
            key={index}
            className="ds-text-chip flex-1 text-center text-ink-3"
          >
            {initial}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.date} className="flex-row">
          {week.map((day) => {
            const number = day.selected
              ? "text-on-color"
              : day.today
                ? "text-sun"
                : day.adjacent
                  ? "text-ink-3"
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
                className="min-h-12 flex-1 items-center justify-center gap-0.5"
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${day.selected ? "bg-grape" : ""}`}
                >
                  <Text className={`ds-text-calendar-month-day ${number}`}>
                    {day.number}
                  </Text>
                </View>
                <View className="h-1 flex-row gap-0.5">
                  {Array.from({ length: day.dots }, (_, index) => (
                    <View
                      key={index}
                      testID={`calendar-day-${day.date}-dot`}
                      className="h-1 w-1 rounded-full bg-lagoon"
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
