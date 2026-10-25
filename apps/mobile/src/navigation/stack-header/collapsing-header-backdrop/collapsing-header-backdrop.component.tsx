import { View } from "react-native";
import Animated from "react-native-reanimated";

import { useCollapsingHeaderBackdrop } from "./collapsing-header-backdrop.hook";
import { CollapsingHeaderBackdropProps } from "./collapsing-header-backdrop.types";
import {
  FADE_BANDS,
  FADE_BAND_HEIGHT,
} from "./collapsing-header-backdrop.constants";

/**
 * The page color behind the transparent header that fades out below it, appearing with the header's title: the content
 * that scrolls under the header disappears behind the title instead of crossing it. The fade is a stack of thin bands
 * of decreasing opacity (a gradient needs a native module). Place it over the scroll view, as its sibling.
 */
export function CollapsingHeaderBackdrop({
  progress,
  height,
}: CollapsingHeaderBackdropProps) {
  const { animatedStyle } = useCollapsingHeaderBackdrop({ progress });

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-x-0 top-0"
      style={animatedStyle}
    >
      <View className="bg-page" style={{ height }} />
      {FADE_BANDS.map((opacity) => (
        <View
          key={opacity}
          className="bg-page"
          style={{ height: FADE_BAND_HEIGHT, opacity }}
        />
      ))}
    </Animated.View>
  );
}
