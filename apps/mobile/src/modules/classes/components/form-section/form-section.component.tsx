import { Text, TouchableOpacity, View } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { FormSectionProps } from "./form-section.types";

/** A labelled block of the Nova aula form. */
export function FormSection({
  label,
  hint,
  action,
  children,
}: FormSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text
          accessibilityRole="header"
          className="ds-text-section-label text-ink-2"
        >
          {label}
        </Text>
        {hint ? (
          <Text className="ds-text-list-subtitle shrink text-ink-2">
            {hint}
          </Text>
        ) : null}
        {action ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            onPress={action.onPress}
            className="min-h-11 justify-center"
          >
            <Text className="ds-text-chip text-grape">{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}
