export type DenySheetProps = {
  visible: boolean;
  title: string;
  hint: string;
  /** Accessibility label of the text area (there is no visible label). */
  label: string;
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
