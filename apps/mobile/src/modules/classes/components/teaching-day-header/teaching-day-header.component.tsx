import { Text, View } from "react-native";

import type { TeachingDayHeaderProps } from "./teaching-day-header.types";

/** The header of a day of "Minhas aulas": its name on the left and its short date on the right. */
export function TeachingDayHeader({ label, date }: TeachingDayHeaderProps) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${label}, ${date}`}
      className="flex-row items-baseline justify-between pt-4"
    >
      <Text className="ds-text-section-label text-ink-2">{label}</Text>
      <Text className="ds-text-list-subtitle text-ink-2">{date}</Text>
    </View>
  );
}
