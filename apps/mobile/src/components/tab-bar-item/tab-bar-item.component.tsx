import { Feather, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";

import { iconSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { TabBarItemProps } from "./tab-bar-item.types";

/** One tab: an icon over its label, both in `sun` while selected. */
export function TabBarItem({
  label,
  icon,
  selected,
  onPress,
}: TabBarItemProps) {
  const theme = useTheme();
  const color = selected ? theme.sun : theme.ink2;

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      activeOpacity={0.7}
      className="min-h-14 flex-1 items-center justify-center gap-1"
      onPress={onPress}
    >
      {icon.set === "Feather" ? (
        <Feather name={icon.name} size={iconSizes.bar} color={color} />
      ) : icon.set === "FontAwesome6" ? (
        <FontAwesome6
          name={icon.name}
          size={iconSizes.bar}
          color={color}
          regular
        />
      ) : (
        <Ionicons name={icon.name} size={iconSizes.bar} color={color} />
      )}
      <Text
        className={`ds-text-tab-bar-label ${selected ? "text-sun" : "text-ink-2"}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
