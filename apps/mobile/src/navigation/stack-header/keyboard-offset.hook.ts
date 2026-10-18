import { useHeaderHeight } from "expo-router/react-navigation";

/**
 * `keyboardVerticalOffset` for a `KeyboardAvoidingView` that sits below the native header: the view measures its
 * frame against its parent, but the keyboard's position is relative to the window, so the header's height is
 * missing from the padding (see spec 038, F-01).
 */
export const useKeyboardOffset = (): number => useHeaderHeight();
