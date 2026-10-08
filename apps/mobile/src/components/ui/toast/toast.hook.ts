import { useEffect } from "react";
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ToastProps } from "./toast.types";

export const TOAST_ENTER_DURATION = 250;
export const TOAST_VISIBLE_DURATION = 3000;
export const TOAST_EXIT_DURATION = 200;

const HIDDEN_OFFSET = -24;

type UseToastProps = Pick<ToastProps, "onHidden">;

export const useToast = ({ onHidden }: UseToastProps) => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [HIDDEN_OFFSET, 0]) },
    ],
  }));

  useEffect(() => {
    progress.set(withTiming(1, { duration: TOAST_ENTER_DURATION }));

    const hideTimeout = setTimeout(() => {
      progress.set(withTiming(0, { duration: TOAST_EXIT_DURATION }));
    }, TOAST_VISIBLE_DURATION);
    const hiddenTimeout = setTimeout(
      onHidden,
      TOAST_VISIBLE_DURATION + TOAST_EXIT_DURATION,
    );

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(hiddenTimeout);
    };
  }, [progress, onHidden]);

  return { animatedStyle };
};
