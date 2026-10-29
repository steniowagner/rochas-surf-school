import type { ReactNode } from "react";

export type AuthButtonProps = {
  variant: "light" | "primary";
  label: string;
  icon: ReactNode;
  /** Shows a spinner instead of the label. */
  loading?: boolean;
};
