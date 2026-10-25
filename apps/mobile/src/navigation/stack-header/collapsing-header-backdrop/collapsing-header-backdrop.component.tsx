import Animated from "react-native-reanimated";

import { useCollapsingHeaderBackdrop } from "./collapsing-header-backdrop.hook";
import { CollapsingHeaderBackdropProps } from "./collapsing-header-backdrop.types";

/**
 * Page color behind the transparent header, scaled by the hook's `MAX_OPACITY` (none for now) and fading in with the
 * header's title. Place it over the scroll view, as its sibling.
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
