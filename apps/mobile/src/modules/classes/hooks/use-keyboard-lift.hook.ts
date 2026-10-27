import { useEffect, useState } from "react";
import { Keyboard } from "react-native";
import {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";

/**
 * The style of a panel pinned to the bottom of the screen that rides on top of the keyboard. Reanimated's height is
 * trusted while React Native sees the keyboard, or while Reanimated animates it: on Android, a screen that listened to
 * the keyboard and left with it open leaves Reanimated stuck on "open" at that height (it stops listening, then takes
 * the 0 that follows for a one-frame glitch), with no keyboard on screen.
 */
export const useKeyboardLift = () => {
  const keyboard = useAnimatedKeyboard();
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () =>
      setVisible(true),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () =>
      setVisible(false),
    );

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return useAnimatedStyle(() => {
    const state = keyboard.state.get();
    const moving =
      state === KeyboardState.OPENING || state === KeyboardState.CLOSING;
    const lift = visible || moving ? keyboard.height.get() : 0;

    return { transform: [{ translateY: -lift }] };
  });
};
