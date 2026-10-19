import { useHeaderHeight } from "expo-router/react-navigation";
import { isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * Top padding for a screen that doesn't scroll: under the transparent header its content starts at the top of the
 * window, so it must clear the header's height; under the opaque header the content already starts below it
 * (spec 038, D-06).
 */
export const useHeaderInset = (): number => {
  const headerHeight = useHeaderHeight();

  return isLiquidGlassAvailable() ? headerHeight : 0;
};
