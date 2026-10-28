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
  const isBoxed = variant === "boxed";
  const boxClasses = checked
    ? "border-lagoon bg-lagoon"
    : "border-input-line bg-input";
  // The ink-2 fill inverts with the theme, so page-colored text stays readable on it in both.
  const containerClasses = isBoxed ? "rounded-control bg-ink-2 px-4 py-3" : "";
  const labelClasses = isBoxed ? "text-page" : "text-ink";
  const helperClasses = isBoxed ? "text-page" : "text-ink-2";

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
        <Text className={`ds-text-list-title ${labelClasses}`}>{label}</Text>
        {helper ? (
          <Text className={`ds-text-list-subtitle ${helperClasses}`}>
            {helper}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
