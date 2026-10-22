import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export const SKELETON_PULSE_DURATION = 800;
export const SKELETON_DIM_OPACITY = 0.45;

export const useSkeleton = () => {
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    // Fades down and back up forever; with Reduce Motion on, Reanimated leaves it still.
    opacity.set(
      withRepeat(
        withTiming(SKELETON_DIM_OPACITY, {
          duration: SKELETON_PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, [opacity]);

  return { animatedStyle };
};
