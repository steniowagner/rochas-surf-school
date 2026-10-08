import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Press feedback for every button in the app (they are built with TouchableOpacity). */
export const BUTTON_ACTIVE_OPACITY = 0.7;

export type ButtonVariant =
  "primary" | "dark" | "outline" | "subtle" | "danger";

// Same classes as the web Button (apps/web/src/components/ui/button.tsx), minus hover states.
const variantClasses: Record<
  ButtonVariant,
  { container: string; label: string }
> = {
  primary: { container: "bg-sun", label: "text-on-color" },
  dark: { container: "bg-grape", label: "text-on-color" },
  outline: { container: "border border-input-line", label: "text-ink" },
  subtle: { container: "bg-dim", label: "text-ink-2" },
  danger: { container: "bg-bad", label: "text-on-color" },
};

const disabledClasses = { container: "bg-sand", label: "text-ink-2" };

export type ButtonProps = Omit<TouchableOpacityProps, "children"> & {
  variant?: ButtonVariant;
  className?: string;
  children: string;
  /** Shows a spinner instead of the label and ignores presses. */
  loading?: boolean;
};

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
  const { container, label } = disabled
    ? disabledClasses
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
        variant === "primary" && !disabled ? shadowStyle("primary", theme) : null,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={theme.onColor} />
      ) : (
        <Text className={`ds-text-button ${label}`}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
