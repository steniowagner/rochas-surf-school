import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import Animated from "react-native-reanimated";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { iconSizes, shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { DisciplineFilterButtonProps } from "./discipline-filter-button.types";

/** The sport filter's 56×56 `grape` button (AGENDA-01B): the closed one in the screen, and the open one over the scrim. */
export function DisciplineFilterButton({
  icon,
  label,
  onPress,
  turnStyle,
  turnTestID,
  hidden = false,
}: DisciplineFilterButtonProps) {
  const theme = useTheme();

  return (
    // The whole button turns, shadow included, as in the design.
    <Animated.View
      testID={turnTestID}
      style={turnStyle}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={BUTTON_ACTIVE_OPACITY}
        onPress={onPress}
        className="h-14 w-14 items-center justify-center rounded-card bg-grape"
        style={shadowStyle("fab", theme)}
      >
        <Ionicons name={icon} size={iconSizes.bar} color={theme.onColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}
