import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { BUTTON_ACTIVE_OPACITY } from "../button/button.constants";

import type { HeaderButtonProps } from "./header-button.types";

/** The action at the right of a native stack header: just the icon, with no circle, background or shadow. */
export function HeaderButton({ icon, label, onPress }: HeaderButtonProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={theme.ink} />
    </TouchableOpacity>
  );
}
