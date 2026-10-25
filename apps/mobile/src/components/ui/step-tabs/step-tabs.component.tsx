import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { StepTabsProps } from "./step-tabs.types";

export function StepTabs<T extends string>({
  steps,
  selected,
  onChange,
}: StepTabsProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 rounded-card bg-sand p-1"
    >
      {steps.map((step, index) => {
        const isSelected = step.key === selected;
        const disabled = step.disabled ?? false;

        return (
          <TouchableOpacity
            key={step.key}
            accessibilityRole="tab"
            accessibilityLabel={`${step.label}, ${step.value}`}
            accessibilityState={{ selected: isSelected, disabled }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            disabled={disabled}
            onPress={isSelected ? undefined : () => onChange(step.key)}
            className={`min-h-11 flex-1 flex-row items-center gap-2 rounded-card p-2 ${isSelected ? "bg-surface" : ""} ${disabled ? "opacity-50" : ""}`}
            style={isSelected ? shadowStyle("iconButton", theme) : undefined}
          >
            <View
              className={`size-7 items-center justify-center rounded-full ${step.done ? "bg-ok" : "bg-sand"}`}
            >
              {step.done ? (
                <Ionicons name="checkmark" size={16} color={theme.onColor} />
              ) : (
                <Text className="ds-text-chip text-ink-2">{index + 1}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="ds-text-chip text-ink-2">
                {step.label}
              </Text>
              <Text numberOfLines={1} className="ds-text-list-subtitle text-ink">
                {step.value}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
