import { useAnimatedStyle } from "react-native-reanimated";

import { CollapsingHeaderBackdropProps } from "./collapsing-header-backdrop.types";

export const useCollapsingHeaderBackdrop = ({
  progress,
}: Pick<CollapsingHeaderBackdropProps, "progress">) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  return { animatedStyle };
};
