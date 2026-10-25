import { createElement } from "react";
import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

import { CollapsingHeaderBackdrop } from "./collapsing-header-backdrop";
import { CollapsingHeaderTitle } from "./collapsing-header-title";
import { UseCollapsingTitleHeaderProps } from "./collapsing-title-header.types";
import { useHeaderInset } from "./header-inset.hook";

// The header's title starts fading in this far before the large title is completely under the header.
const FADE_DISTANCE = 16;
// Until the large title is measured, the header title stays hidden.
const NOT_MEASURED = 100000;

/**
 * The scroll-driven header title (the iOS large-title pattern): the screen scrolls an `Animated.ScrollView` with
 * `scrollHandler`, reports where its large title ends with `onTitleBottomChange` (relative to the title's own
 * block, e.g. `ScreenIntro`'s `onTitleLayout`), and spreads `headerOptions` into `<Stack.Screen options>`.
 */
export const useCollapsingTitleHeader = ({
  title,
  contentTop,
}: UseCollapsingTitleHeaderProps) => {
  // Under the transparent header the scroll content starts behind it, so the resting offset is minus its height.
  const headerInset = useHeaderInset();
  const scrollY = useSharedValue(0);
  // Until the first scroll event the offset is unknown (it isn't 0: it rests at minus the header's height).
  const hasScrolled = useSharedValue(false);
  const titleBottom = useSharedValue(NOT_MEASURED);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
    hasScrolled.set(true);
  });

  const progress = useDerivedValue(() => {
    const scrolled = hasScrolled.get() ? scrollY.get() + headerInset : 0;
    const end = titleBottom.get();

    return interpolate(
      scrolled,
      [end - FADE_DISTANCE, end],
      [0, 1],
      Extrapolation.CLAMP,
    );
  });

  const onTitleBottomChange = (bottom: number) => {
    titleBottom.set(contentTop + bottom);
  };

  return {
    // Where the header is transparent the content scrolls under it: the backdrop keeps the title legible.
    backdrop:
      headerInset > 0
        ? createElement(CollapsingHeaderBackdrop, {
            progress,
            height: headerInset,
          })
        : null,
    scrollHandler,
    onTitleBottomChange,
    headerOptions: {
      headerTitle: () =>
        createElement(CollapsingHeaderTitle, { title, progress }),
    },
  };
};
