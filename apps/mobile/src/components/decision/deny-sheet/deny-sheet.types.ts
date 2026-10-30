import type { ReactNode } from "react";

export type DenySheetProps = {
  visible: boolean;
  title: string;
  /** What the decision is about, drawn between the title and the hint. */
  summary?: ReactNode;
  hint: string;
  /** Accessibility label of the text area; also drawn above it when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  /** Leaves the reason field out, for a sheet that only asks to confirm. */
  hideReason?: boolean;
  /** Leaves the icon out of the confirm button. */
  hideConfirmIcon?: boolean;
  placeholder: string;
  backLabel: string;
  /** The back button's look; `subtle` unless a sheet asks for less weight. */
  backVariant?: "subtle" | "ghost";
  confirmLabel: string;
  maxLength: number;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export type UseDenySheetProps = Pick<
  DenySheetProps,
  "visible" | "onConfirm" | "onClose"
>;
