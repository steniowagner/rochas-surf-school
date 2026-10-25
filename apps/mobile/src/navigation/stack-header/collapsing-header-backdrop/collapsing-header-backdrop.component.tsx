import Animated from "react-native-reanimated";

import { useCollapsingHeaderBackdrop } from "./collapsing-header-backdrop.hook";
import { CollapsingHeaderBackdropProps } from "./collapsing-header-backdrop.types";

/**
 * The page color behind the transparent header, fading in with the header's title: without it the content that
 * scrolls under the header shows through the title. Place it over the scroll view, as its sibling.
 */
export function CollapsingHeaderBackdrop({
  progress,
  height,
}: CollapsingHeaderBackdropProps) {
  const { animatedStyle } = useCollapsingHeaderBackdrop({ progress });

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-x-0 top-0 bg-page"
      style={[{ height }, animatedStyle]}
    />
  );
}
