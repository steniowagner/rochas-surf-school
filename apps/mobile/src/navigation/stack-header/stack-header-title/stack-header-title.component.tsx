import { Text } from "react-native";

import { StackHeaderTitleProps } from "./stack-header-title.types";

/**
 * A screen's title in the native header, as a view. A plain-string `headerTitle` makes iOS 26 draw a frosted band
 * with a line under the transparent header instead of the soft scroll-edge fade (spec 038, F-06).
 */
export function StackHeaderTitle({ title }: StackHeaderTitleProps) {
  return (
    <Text className="ds-text-screen-title-with-back text-ink">
      {title.toLocaleUpperCase()}
    </Text>
  );
}
