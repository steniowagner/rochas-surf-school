import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { CheckboxProps } from "./checkbox.types";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps) {
  const theme = useTheme();
  const boxClasses = checked
    ? "border-lagoon bg-lagoon"
    : "border-input-line bg-input";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={`min-h-11 flex-row items-center gap-3 ${disabled ? "opacity-50" : ""}`}
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
      <Text className="ds-text-list-title flex-1 text-ink">{label}</Text>
    </Pressable>
  );
}
