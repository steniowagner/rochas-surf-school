import { Text, View } from "react-native";

import { OccupancyStatProps } from "./occupancy-stat.types";

/** One figure of the week's stats card, with its label under it, read by a screen reader as a single element. */
export function OccupancyStat({
  testID,
  value,
  label,
  accessibilityLabel,
  valueClassName,
  hasDivider,
}: OccupancyStatProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
      className={`flex-1 items-center py-3 ${hasDivider ? "border-l border-line" : ""}`}
    >
      <Text
        numberOfLines={1}
        className={`ds-text-day-number ${valueClassName}`}
      >
        {value}
      </Text>
      <Text numberOfLines={1} className="ds-text-chip text-ink-2">
        {label}
      </Text>
    </View>
  );
}
