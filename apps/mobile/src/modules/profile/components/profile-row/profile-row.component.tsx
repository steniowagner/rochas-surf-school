import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { ProfileRowProps } from "./profile-row.types";

/** One row of a profile card: a lagoon icon, the label, an optional value and a chevron; at least 44 pt tall. */
export function ProfileRow({
  icon,
  label,
  value,
  onPress,
  hideChevron = false,
  trailing,
}: ProfileRowProps) {
  const theme = useTheme();

  const content = (
    <>
      <Ionicons name={icon} size={20} color={theme.lagoon} />
      <Text className="ds-text-list-title flex-1 text-ink">{label}</Text>
      {trailing}
      {!trailing && value ? (
        <Text className="ds-text-list-subtitle text-ink-2">{value}</Text>
      ) : null}
      {!trailing && onPress && !hideChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.ink3} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View className="min-h-11 flex-row items-center gap-3 py-3">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 py-3"
    >
      {content}
    </Pressable>
  );
}
