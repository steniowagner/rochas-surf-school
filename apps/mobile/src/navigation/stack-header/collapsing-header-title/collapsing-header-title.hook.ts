import {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { CollapsingHeaderTitleProps } from "./collapsing-header-title.types";

const HIDDEN_OFFSET = 8;

export const useCollapsingHeaderTitle = ({
  progress,
}: Pick<CollapsingHeaderTitleProps, "progress">) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [HIDDEN_OFFSET, 0]) },
    ],
  }));

  return { animatedStyle };
};
