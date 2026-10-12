export type DecisionCardProps = {
  title: string;
  subtitle?: string;
  details: string[];
  initials: string;
  approveLabel: string;
  denyLabel: string;
  onApprove: () => void;
  onDeny: () => void;
  /** Disables both buttons. */
  disabled: boolean;
  /** The button that shows its loading state. */
  loading?: "approve" | "deny";
};
