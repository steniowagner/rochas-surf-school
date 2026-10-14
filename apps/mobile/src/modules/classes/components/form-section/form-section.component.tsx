import { Text, View } from "react-native";

import { FormSectionProps } from "./form-section.types";

/** A labelled block of the Nova aula form. */
export function FormSection({ label, hint, children }: FormSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text accessibilityRole="header" className="ds-text-section-label text-ink-2">
          {label}
        </Text>
        {hint ? (
          <Text className="ds-text-list-subtitle shrink text-ink-2">{hint}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
