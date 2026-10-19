import { useHeaderHeight } from "expo-router/react-navigation";
import { isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * `keyboardVerticalOffset` for a `KeyboardAvoidingView` below the native header. Under the opaque header the view
 * starts below it, but the keyboard's position is relative to the window, so the header's height is missing from
 * the padding (spec 038, F-01); under the transparent header the view starts at the top of the window: 0 (D-06).
 */
export const useKeyboardOffset = (): number => {
  const headerHeight = useHeaderHeight();

  return isLiquidGlassAvailable() ? 0 : headerHeight;
};
