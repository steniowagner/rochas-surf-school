export type DenySheetProps = {
  title: string;
  hint: string;
  label?: string;
  showLabel?: boolean;
  hideReason?: boolean;
  placeholder?: string;
  reason?: string;
  maxLength: number;
  backLabel: string;
  confirmLabel: string;
  loading?: boolean;
};
