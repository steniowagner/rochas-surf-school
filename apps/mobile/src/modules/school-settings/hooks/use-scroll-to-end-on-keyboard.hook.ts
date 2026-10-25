import { useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";
import type Animated from "react-native-reanimated";

/**
 * The ref of a scroll view that scrolls to its end when the keyboard opens: for a form whose last field is its only
 * input, so the keyboard doesn't cover it.
 */
export const useScrollToEndOnKeyboard = () => {
  const scrollRef = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => scrollRef.current?.scrollToEnd({ animated: true }),
    );

    return () => subscription.remove();
  }, []);

  return scrollRef;
};
