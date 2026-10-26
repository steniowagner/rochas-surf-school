import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { entryRowContainerClassName } from "@/utils/entry-row-container";

import type { AdminToolRowProps } from "./admin-tool-row.types";

/** A row of the admin home's Tools card, laid out like the School rows: icon, title with its subtitle, a count of what waits and a chevron. */
export function AdminToolRow({
  grouped,
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: AdminToolRowProps) {
  const theme = useTheme();

  return (
    <View className={entryRowContainerClassName(grouped)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        className="min-h-11 flex-row items-center gap-3 py-3"
      >
        <MaterialCommunityIcons name={icon} size={20} color={theme.lagoon} />
        {subtitle ? (
          <View className="flex-1 gap-0.5">
            <Text className="ds-text-list-title text-ink">{title}</Text>
            <Text className="ds-text-list-subtitle text-ink-2">{subtitle}</Text>
          </View>
        ) : (
          // Two blank lines keep the row as tall as the ones with a subtitle, and the title sits centered over them, level with the icon.
          <View className="flex-1 justify-center gap-0.5">
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="gap-0.5 opacity-0"
            >
              <Text className="ds-text-list-title"> </Text>
              <Text className="ds-text-list-subtitle"> </Text>
            </View>
            <View className="absolute inset-0 justify-center">
              <Text className="ds-text-list-title text-ink">{title}</Text>
            </View>
          </View>
        )}
        {badge ? (
          <View className="h-[22px] min-w-[22px] items-center justify-center rounded-full bg-bad px-1.5">
            <Text className="ds-text-badge text-white">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={theme.ink2} />
      </Pressable>
    </View>
  );
}
