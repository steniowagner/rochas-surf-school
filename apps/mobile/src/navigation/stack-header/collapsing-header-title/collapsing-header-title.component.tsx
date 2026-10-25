import Animated from "react-native-reanimated";

import { StackHeaderTitle } from "../stack-header-title";

import { useCollapsingHeaderTitle } from "./collapsing-header-title.hook";
import { CollapsingHeaderTitleProps } from "./collapsing-header-title.types";

/**
 * A screen's title in the native header that fades in as the large title in the content scrolls under the header,
 * like the Messages app. The content already shows the same title, so the header's copy is hidden from screen readers.
 */
export function CollapsingHeaderTitle({
  title,
  progress,
}: CollapsingHeaderTitleProps) {
  const { animatedStyle } = useCollapsingHeaderTitle({ progress });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={animatedStyle}
    >
      <StackHeaderTitle title={title} />
    </Animated.View>
  );
}
