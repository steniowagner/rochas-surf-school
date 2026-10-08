import {
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

export type ButtonProps = Omit<TouchableOpacityProps, "children"> & {
  variant?: ButtonVariant;
  className?: string;
  children: string;
};

export function Button({
  variant = "primary",
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const { container, label } = variantClasses[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      className={`min-h-11 items-center justify-center rounded-control px-[18px] py-[15px] ${container} ${className}`}
      // The elevation token needs the palette's shadow color, so it can't be a static class.
      style={[
        variant === "primary" ? shadowStyle("primary", theme) : null,
        style,
      ]}
      {...props}
    >
      <Text className={`ds-text-button ${label}`}>{children}</Text>
    </TouchableOpacity>
  );
}
