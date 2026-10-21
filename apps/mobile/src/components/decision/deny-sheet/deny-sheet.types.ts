export type DenySheetProps = {
  visible: boolean;
  title: string;
  hint: string;
  /** Accessibility label of the text area; also drawn above it when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  /** Leaves the reason field out, for a sheet that only asks to confirm. */
  hideReason?: boolean;
  placeholder: string;
  backLabel: string;
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
