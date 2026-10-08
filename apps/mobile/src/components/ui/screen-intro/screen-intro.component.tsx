import { Text, View } from "react-native";

import { ScreenIntroProps } from "./screen-intro.types";

export function ScreenIntro({ icon, title, description }: ScreenIntroProps) {
  return (
    <View className="gap-3">
      <View className="h-16 w-16 items-center justify-center rounded-card bg-sand">
        {icon}
      </View>
      <Text
        accessibilityRole="header"
        className="ds-text-screen-title text-ink"
      >
        {title}
      </Text>
      <Text className="ds-text-body text-ink-2">{description}</Text>
    </View>
  );
}
