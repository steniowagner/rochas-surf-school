import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import type { ClassRuleRowProps } from "./class-rule-row.types";

/** A row of the class's "Regras" card: an icon tile, an uppercase title, a bold value and a chevron. */
export function ClassRuleRow({ icon, title, value, onPress }: ClassRuleRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 px-3.5 py-3"
    >
      <View className="h-[34px] w-[34px] items-center justify-center rounded-checkbox bg-dim">
        <Ionicons name={icon} size={17} color={theme.lagoon} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="ds-text-section-label text-ink-2">{title}</Text>
        {value ? (
          <Text numberOfLines={1} className="ds-text-list-title text-ink">
            {value}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={theme.ink3} />
    </Pressable>
  );
}
