import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { toneStyles } from "./toast.constants";
import { useToast } from "./toast.hook";
import { ToastProps } from "./toast.types";

export function Toast({ message, tone = "error", onHidden }: ToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { background, icon } = toneStyles[tone];
  const { animatedStyle } = useToast({ onHidden });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      className={`absolute left-screen right-screen z-50 flex-row items-center gap-2.5 rounded-control ${background} px-4 py-3.5`}
      style={[
        { top: insets.top + 12 },
        shadowStyle("card", theme),
        animatedStyle,
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.onColor} />
      <Text className="ds-text-list-title flex-1 text-on-color">{message}</Text>
    </Animated.View>
  );
}
