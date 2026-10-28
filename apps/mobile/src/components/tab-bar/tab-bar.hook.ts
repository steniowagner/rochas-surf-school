import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { INDICATOR_DURATION, INDICATOR_WIDTH } from "./tab-bar.constants";
import { TabBarProps } from "./tab-bar.types";

export const useTabBar = ({
  state,
  navigation,
}: Pick<TabBarProps, "state" | "navigation">) => {
  const { bottom } = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const placed = useRef(false);

  const selectedIndex = state.index;
  const tabWidth = barWidth / state.routes.length;
  const targetX = selectedIndex * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    if (barWidth === 0) {
      return;
    }

    // The first measure puts the indicator in place; after that it slides.
    indicatorX.set(
      placed.current
        ? withTiming(targetX, {
            duration: INDICATOR_DURATION,
            easing: Easing.out(Easing.cubic),
          })
        : targetX,
    );
    placed.current = true;
  }, [barWidth, indicatorX, targetX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));

  const handleLayout = (event: LayoutChangeEvent) =>
    setBarWidth(event.nativeEvent.layout.width);

  const handlePress = (
    routeKey: string,
    routeName: string,
    selected: boolean,
  ) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!selected && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return {
    bottomInset: bottom,
    selectedIndex,
    indicatorStyle,
    handleLayout,
    handlePress,
  };
};
