import { Text, View } from "react-native";

import { ScreenIntroProps } from "./screen-intro.types";

export function ScreenIntro({
  icon,
  title,
  description,
  eyebrow,
  iconTileClassName = "bg-sand",
}: ScreenIntroProps) {
  return (
    <View className="gap-3">
      <View
        className={`h-16 w-16 items-center justify-center rounded-card ${iconTileClassName}`}
      >
        {icon}
      </View>
      <View className="gap-1">
        {eyebrow ? (
          <Text className="ds-text-section-label text-ink-2">{eyebrow}</Text>
        ) : null}
        <Text
          accessibilityRole="header"
          className="ds-text-screen-title text-ink"
        >
          {title}
        </Text>
      </View>
      <Text className="ds-text-body text-ink-2">{description}</Text>
    </View>
  );
}
