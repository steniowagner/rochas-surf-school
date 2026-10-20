import { ReactNode } from "react";

export type DecisionCardProps = {
  title: string;
  subtitle?: string;
  details: string[];
  /** Drawn at the start of the card's upper row. */
  avatar: ReactNode;
  approveLabel: string;
  denyLabel: string;
  onApprove: () => void;
  onDeny: () => void;
  /** Makes the upper row (avatar, text, chevron) pressable. */
  onPress?: () => void;
  /** Disables both buttons. */
  disabled: boolean;
  /** Disables the approve button alone (for example while a class is full). */
  approveDisabled?: boolean;
  /** The button that shows its loading state. */
  loading?: "approve" | "deny";
};
