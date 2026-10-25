import { useAnimatedStyle } from "react-native-reanimated";

import { CollapsingHeaderBackdropProps } from "./collapsing-header-backdrop.types";

// Not fully opaque: the content that scrolls under the header stays faintly visible, but not enough to cross the title.
const MAX_OPACITY = 0;

export const useCollapsingHeaderBackdrop = ({
  progress,
}: Pick<CollapsingHeaderBackdropProps, "progress">) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get() * MAX_OPACITY,
  }));

  return { animatedStyle };
};
