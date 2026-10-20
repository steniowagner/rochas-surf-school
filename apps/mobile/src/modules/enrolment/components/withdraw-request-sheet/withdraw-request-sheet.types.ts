export type WithdrawRequestSheetProps = {
  visible: boolean;
  /** The withdrawal is being sent. */
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
