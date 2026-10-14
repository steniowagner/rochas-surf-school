import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { SegmentedControlProps } from "./segmented-control.types";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" className="flex-row gap-1 rounded-card bg-sand p-1">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={selected ? undefined : () => onChange(option.value)}
            className={`min-h-11 flex-1 items-center justify-center rounded-card px-2 ${selected ? "bg-surface" : ""}`}
            style={selected ? shadowStyle("iconButton", theme) : undefined}
          >
            <Text
              numberOfLines={1}
              className={`ds-text-chip uppercase ${selected ? "text-ink" : "text-ink-2"}`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
