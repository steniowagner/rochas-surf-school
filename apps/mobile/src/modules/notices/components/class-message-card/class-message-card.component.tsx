import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ClassMessageCardProps } from "./class-message-card.types";

/**
 * The class a message goes to, in place of the audience picker (spec 069, D-09): its name, day, time and location, then
 * the people who receive it — the instructors and the students with a seat by name, and the pending requests by number.
 */
export function ClassMessageCard({ view }: ClassMessageCardProps) {
  const theme = useTheme();

  return (
    <View
      testID="class-message-card"
      className="gap-3 rounded-card bg-surface p-4"
      style={shadowStyle("card", theme)}
    >
      <View className="gap-1">
        <Text className="ds-text-list-title text-ink">{view.name}</Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={14} color={theme.ink2} />
          <Text className="ds-text-list-subtitle flex-1 text-ink-2">{view.when}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="location-outline" size={14} color={theme.ink2} />
          <Text className="ds-text-list-subtitle flex-1 text-ink-2">{view.locationName}</Text>
        </View>
      </View>
      {view.groups.length > 0 || view.pendingLine !== null ? (
        <View className="gap-2 border-t border-line pt-3">
          {view.groups.map((group) => (
            <View key={group.key} testID={`class-message-${group.key}`} className="gap-0.5">
              <Text className="ds-text-section-label text-ink-2">{group.label}</Text>
              <Text className="ds-text-list-subtitle text-ink">{group.names.join(", ")}</Text>
            </View>
          ))}
          {view.pendingLine !== null ? (
            <Text className="ds-text-list-subtitle text-ink-2">{view.pendingLine}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
