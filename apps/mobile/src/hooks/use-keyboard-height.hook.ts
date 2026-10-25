import { useAnimatedKeyboard } from "react-native-reanimated";

/** The keyboard's height as a shared value: 0 while it is closed, animated with it as it opens and closes. */
export const useKeyboardHeight = () => useAnimatedKeyboard().height;
