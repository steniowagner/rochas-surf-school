import { Text, View } from "react-native";

import { StackHeaderTitleProps } from "./stack-header-title.types";

/**
 * A screen's title in the native header, as a view. A plain-string `headerTitle` makes iOS 26 draw a frosted band
 * with a line under the transparent header instead of the soft scroll-edge fade (spec 038, F-06). An optional
 * subtitle (a count, for instance) goes above it.
 */
export function StackHeaderTitle({ title, subtitle }: StackHeaderTitleProps) {
  const titleText = (
    <Text className="ds-text-screen-title-with-back text-ink">
      {title.toLocaleUpperCase()}
    </Text>
  );

  if (!subtitle) {
    return titleText;
  }

  return (
    <View className="items-start">
      <Text className="ds-text-section-label text-ink-2">{subtitle}</Text>
      {titleText}
    </View>
  );
}
