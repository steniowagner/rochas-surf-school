import { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";

const OPEN_KEYBOARD_PADDING = 12;

/**
 * The style of a footer pinned to the bottom of the screen that rides on top of the keyboard. It is positioned over
 * the scroll view instead of wrapping it, so the scroll view stays a direct child of the screen, which the header's
 * scroll-edge effect needs. Its bottom padding is the safe area at rest and a small gap above the keyboard.
 */
export const usePinnedFooter = (restingPaddingBottom: number) => {
  const keyboard = useAnimatedKeyboard();

  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom:
      keyboard.height.get() > 0 ? OPEN_KEYBOARD_PADDING : restingPaddingBottom,
    transform: [{ translateY: -keyboard.height.get() }],
  }));

  return animatedStyle;
};
