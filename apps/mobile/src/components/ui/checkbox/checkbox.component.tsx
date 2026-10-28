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
  // The subtle button's fill and radius; the text keeps its usual colors on it.
  const containerClasses = isBoxed ? "rounded-control bg-dim px-4 py-3" : "";

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
        <Text className="ds-text-list-title text-ink">{label}</Text>
        {helper ? (
          <Text className="ds-text-list-subtitle text-ink-2">{helper}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
