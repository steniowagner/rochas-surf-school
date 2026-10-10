import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { ChoiceRowProps } from "./choice-row.types";

export function ChoiceRow({
  icon,
  title,
  description,
  onPress,
}: ChoiceRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3.5 rounded-card border-[1.5px] border-line bg-surface p-4"
    >
      <View className="h-12 w-12 items-center justify-center rounded-control bg-sand">
        <Ionicons name={icon} size={24} color={theme.grape} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="ds-text-list-title text-ink">{title}</Text>
        <Text className="ds-text-list-subtitle text-ink-2">{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.ink2} />
    </Pressable>
  );
}
