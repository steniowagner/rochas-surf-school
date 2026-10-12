export type DenySheetProps = {
  visible: boolean;
  title: string;
  hint: string;
  label: string;
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
