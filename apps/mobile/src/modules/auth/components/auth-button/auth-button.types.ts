import { ReactNode } from "react";

export type AuthButtonProps = {
  variant: "light" | "primary";
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  /** Shows a spinner instead of the label and ignores presses. */
  loading?: boolean;
};
