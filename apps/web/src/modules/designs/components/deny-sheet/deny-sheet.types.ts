import type { ReactNode } from "react";

export type DenySheetProps = {
  title: string;
  /** What the decision is about, drawn between the title and the hint. */
  summary?: ReactNode;
  hint: string;
  label?: string;
  showLabel?: boolean;
  hideReason?: boolean;
  /** Leaves the icon out of the confirm button. */
  hideConfirmIcon?: boolean;
  placeholder?: string;
  reason?: string;
  maxLength: number;
  backLabel: string;
  /** The back button's look; `subtle` unless a sheet asks for less weight. */
  backVariant?: "subtle" | "ghost";
  confirmLabel: string;
  loading?: boolean;
};
