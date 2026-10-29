import type { ReactNode } from "react";

export type DecisionCardProps = {
  title: string;
  subtitle?: string;
  details: string[];
  avatar: ReactNode;
  approveLabel: string;
  denyLabel: string;
  /** Disables both buttons. */
  disabled?: boolean;
  /** Disables the approve button alone. */
  approveDisabled?: boolean;
  loading?: "approve" | "deny";
  /** Drawn with no card of its own (border, background, shadow), to sit inside another card. */
  embedded?: boolean;
  /** The upper row opens the person's details: it is a button with a chevron. */
  pressable?: boolean;
};
