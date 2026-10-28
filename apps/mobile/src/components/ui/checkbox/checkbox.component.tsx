import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { CheckboxProps } from "./checkbox.types";

export function Checkbox({
  checked,
  onChange,
  label,
  helper,
  variant = "plain",
  disabled = false,
}: CheckboxProps) {
  const theme = useTheme();
  const isInk = variant === "ink";
  const boxClasses = checked
    ? "border-lagoon bg-lagoon"
    : "border-input-line bg-input";
  // Like the ink button: the fill and the label invert with the theme; ink-3 stays readable on it in both.
  const containerClasses = isInk ? "rounded-control bg-ink px-4 py-3" : "";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={helper}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={`min-h-11 flex-row items-center gap-3 ${containerClasses} ${disabled ? "opacity-50" : ""}`}
    >
      <View
        className={`h-[26px] w-[26px] items-center justify-center rounded-checkbox border-2 ${boxClasses}`}
      >
        {checked ? (
          <Ionicons
            name="checkmark"
            size={18}
            color={theme.onColor}
            testID="checkmark"
          />
        ) : null}
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          className={`ds-text-list-title ${isInk ? "text-page" : "text-ink"}`}
        >
          {label}
        </Text>
        {helper ? (
          <Text
            className={`ds-text-list-subtitle ${isInk ? "text-ink-3" : "text-ink-2"}`}
          >
            {helper}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
