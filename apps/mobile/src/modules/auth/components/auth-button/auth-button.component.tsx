import { Text, TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button";
import { Colors, shadowStyle } from "@/constants/theme";

import { AuthButtonProps } from "./auth-button.types";

const authButtonClasses: Record<
  AuthButtonProps["variant"],
  { container: string; label: string }
> = {
  light: {
    container: "border border-input-line bg-input",
    label: "text-ink",
  },
  primary: { container: "bg-sun", label: "text-on-color" },
};

const palette = Colors.light;

export function AuthButton({ variant, label, icon, onPress }: AuthButtonProps) {
  const classes = authButtonClasses[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      onPress={onPress}
      className={`min-h-[54px] flex-row items-center justify-center gap-2.5 rounded-control ${classes.container}`}
      style={variant === "primary" ? shadowStyle("primary", palette) : null}
    >
      {icon}
      <Text className={`ds-text-button ${classes.label}`}>{label}</Text>
    </TouchableOpacity>
  );
}
