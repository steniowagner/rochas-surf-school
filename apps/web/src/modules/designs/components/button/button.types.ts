import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "dark" | "ink" | "outline" | "subtle" | "danger" | "success" | "ghost";

export type ButtonProps = {
  variant?: ButtonVariant;
  className?: string;
  children: string;
  /** Shows a spinner instead of the label. */
  loading?: boolean;
  disabled?: boolean;
  /** A glyph drawn before the label. */
  icon?: ReactNode;
};
