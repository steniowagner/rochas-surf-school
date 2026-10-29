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
};
