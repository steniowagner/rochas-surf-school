import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useToast } from "./toast.hook";
import { ToastProps } from "./toast.types";

export function Toast({ message, onHidden }: ToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { animatedStyle } = useToast({ onHidden });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      className="absolute left-[22px] right-[22px] z-50 flex-row items-center gap-2.5 rounded-control bg-bad px-4 py-3.5"
      style={[
        { top: insets.top + 12 },
        shadowStyle("card", theme),
        animatedStyle,
      ]}
    >
      <Ionicons name="alert-circle-outline" size={22} color={theme.onColor} />
      <Text className="ds-text-list-title flex-1 text-on-color">{message}</Text>
    </Animated.View>
  );
}
