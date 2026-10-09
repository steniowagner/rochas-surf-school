import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  BUTTON_ACTIVE_OPACITY,
  disabledClasses,
  disabledGhostClasses,
  variantClasses,
} from "./button.constants";
import { ButtonProps } from "./button.types";

export function Button({
  variant = "primary",
  className = "",
  style,
  children,
  loading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isGhost = variant === "ghost";
  const { container, label } = disabled
    ? isGhost
      ? disabledGhostClasses
      : disabledClasses
    : variantClasses[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled }}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      className={`min-h-11 items-center justify-center rounded-control px-[18px] py-[15px] ${container} ${className}`}
      // The elevation token needs the palette's shadow color, so it can't be a static class.
      style={[
        variant === "primary" && !disabled
          ? shadowStyle("primary", theme)
          : null,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? theme.ink : theme.onColor} />
      ) : (
        <Text className={`ds-text-button ${label}`}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
