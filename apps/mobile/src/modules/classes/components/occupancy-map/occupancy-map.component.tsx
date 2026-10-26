import { Text, View } from "react-native";

import { OccupancyCell } from "../occupancy-cell";
import { OccupancyLegend } from "../occupancy-legend";
import { useOccupancyMap } from "./occupancy-map.hook";
import { OccupancyMapProps } from "./occupancy-map.types";

export function OccupancyMap({
  weekStart,
  today,
  classes,
  selectedId,
  onSelect,
}: OccupancyMapProps) {
  const { days, rows } = useOccupancyMap({ weekStart, today, classes });

  return (
    <View className="gap-3">
      <View className="gap-1">
        <View className="flex-row gap-1">
          <View className="w-11" />
          {days.map((day) => (
            <View key={day.date} className="flex-1 items-center">
              <Text className="ds-text-section-label text-ink-2">
                {day.weekday}
              </Text>
              <Text
                testID={`occupancy-day-${day.date}`}
                className={`ds-text-calendar-month-day ${day.isToday ? "text-sun" : "text-ink"}`}
              >
                {day.dayNumber}
              </Text>
            </View>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={`${row.time}-${rowIndex}`} className="flex-row gap-1">
            <View className="h-11 w-11 justify-center">
              {row.showsTime ? (
                <Text className="ds-text-occupancy-cell text-ink-2">
                  {row.time}
                </Text>
              ) : null}
            </View>
            {row.slots.map((slot, dayIndex) =>
              slot.kind === "class" ? (
                <OccupancyCell
                  key={slot.item.id}
                  item={slot.item}
                  weekday={days[dayIndex].weekday}
                  dayNumber={days[dayIndex].dayNumber}
                  selected={slot.item.id === selectedId}
                  onPress={onSelect}
                />
              ) : (
                <View
                  key={slot.date}
                  testID={`occupancy-empty-${slot.date}`}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  className="h-11 flex-1"
                >
                  <View
                    testID={`occupancy-dashed-${slot.date}`}
                    className="h-11 rounded-occupancy-cell border border-dashed border-line"
                  />
                </View>
              ),
            )}
          </View>
        ))}
      </View>
      <OccupancyLegend />
    </View>
  );
}
