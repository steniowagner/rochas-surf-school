import { ButtonVariant } from "./button.types";

/** Press feedback for every button in the app (they are built with TouchableOpacity). */
export const BUTTON_ACTIVE_OPACITY = 0.7;

// Same classes as the web Button (apps/web/src/components/ui/button.tsx), minus hover states.
export const variantClasses: Record<
  ButtonVariant,
  { container: string; label: string }
> = {
  primary: { container: "bg-sun", label: "text-on-color" },
  dark: { container: "bg-grape", label: "text-on-color" },
  outline: { container: "border border-input-line", label: "text-ink" },
  subtle: { container: "bg-dim", label: "text-ink-2" },
  danger: { container: "bg-bad", label: "text-on-color" },
  // No background and no border: just the label, with the same size and shape as the others.
  ghost: { container: "", label: "text-ink" },
};

export const disabledClasses = { container: "bg-sand", label: "text-ink-2" };
export const disabledGhostClasses = { container: "", label: "text-ink-2" };
