import { useEffect, useRef } from "react";
import { Keyboard } from "react-native";
import type Animated from "react-native-reanimated";

/**
 * The ref of a scroll view that scrolls to its end when the keyboard opens: for a form whose only input is near its
 * end, so the keyboard doesn't cover it. Pair it with `automaticallyAdjustKeyboardInsets` on the scroll view.
 */
export const useScrollToEndOnKeyboard = () => {
  const scrollRef = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    // After the keyboard is up: by then the keyboard avoidance has resized the scroll view, so its end is the end of
    // the field and not what the old, taller size would have left out.
    const subscription = Keyboard.addListener("keyboardDidShow", () =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );

    return () => subscription.remove();
  }, []);

  return scrollRef;
};
