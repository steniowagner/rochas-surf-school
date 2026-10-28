import type { ThemeColor } from "@/constants/theme";

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
  // Ink fill with a page-colored label, so it inverts with the theme (the error state's "Try again").
  ink: { container: "bg-ink", label: "text-page" },
  outline: { container: "border border-input-line", label: "text-ink" },
  subtle: { container: "bg-dim", label: "text-ink-2" },
  danger: { container: "bg-bad", label: "text-on-color" },
  success: { container: "bg-ok", label: "text-on-color" },
  // No background and no border: just the label, with the same size and shape as the others.
  ghost: { container: "", label: "text-ink" },
};

export const disabledClasses = { container: "bg-sand", label: "text-ink-2" };
export const disabledGhostClasses = { container: "", label: "text-ink-2" };

/** The loading spinner takes the color of the variant's label, so it shows on the variant's background. */
export const spinnerColors: Record<ButtonVariant, ThemeColor> = {
  primary: "onColor",
  dark: "onColor",
  ink: "page",
  outline: "ink",
  subtle: "ink2",
  danger: "onColor",
  success: "onColor",
  ghost: "ink",
};
