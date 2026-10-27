import { useEffect, useState } from "react";
import { Keyboard } from "react-native";
import {
  KeyboardState,
  useAnimatedKeyboard,
  useDerivedValue,
} from "react-native-reanimated";

/**
 * The keyboard's height as a shared value: 0 while it is closed, animated with it as it opens and closes.
 *
 * Reanimated's height is trusted only while React Native sees the keyboard or while Reanimated animates it. On
 * Android, when the last screen that listened to the keyboard leaves with it open, Reanimated stops listening and stays
 * on "open" at that height (it takes the 0 that follows for a one-frame glitch), with no keyboard on screen: the next
 * screen would lift its footer for nothing.
 */
export const useKeyboardHeight = () => {
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

  return useDerivedValue(() => {
    const state = keyboard.state.get();
    const moving =
      state === KeyboardState.OPENING || state === KeyboardState.CLOSING;

    return visible || moving ? keyboard.height.get() : 0;
  });
};
