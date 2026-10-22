import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { useTheme } from "@/hooks/use-theme";

import type { ClassToolCardProps } from "./class-tool-card.types";

/** One action of the class tools sheet: an icon tile, a bold title and a small subtitle. */
export function ClassToolCard({
  icon,
  title,
  subtitle,
  tone = "default",
  disabled = false,
  onPress,
}: ClassToolCardProps) {
  const theme = useTheme();
  const danger = tone === "danger";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
      className="min-h-11 flex-1"
    >
      <View
        className={`flex-1 gap-2.5 rounded-card border p-3.5 ${danger ? "border-bad-tint bg-bad-tint" : "border-line bg-surface"} ${disabled ? "opacity-50" : ""}`}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-checkbox ${danger ? "bg-surface" : "bg-dim"}`}
        >
          <Ionicons
            name={icon}
            size={20}
            color={danger ? theme.bad : theme.lagoon}
          />
        </View>
        <View className="gap-0.5">
          <Text
            className={`ds-text-list-title ${danger ? "text-bad" : "text-ink"}`}
          >
            {title}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
