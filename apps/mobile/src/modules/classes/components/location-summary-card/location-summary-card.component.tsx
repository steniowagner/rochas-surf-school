import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { LocationSummaryCardProps } from "./location-summary-card.types";

/** A location in short: the pin, a title and the line under it. */
export function LocationSummaryCard({
  title,
  subtitle,
}: LocationSummaryCardProps) {
  const theme = useTheme();

  return (
    <View
      testID="location-summary-card"
      className="min-h-11 flex-row items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3"
    >
      <Feather name="map-pin" size={16} color={theme.lagoon} />
      <View className="flex-1">
        <Text numberOfLines={2} className="ds-text-list-title text-ink">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="ds-text-list-subtitle text-ink-2">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
