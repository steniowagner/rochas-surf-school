export type CancelSeatSheetProps = {
  visible: boolean;
  /** The cancellation is being sent. */
  loading: boolean;
  /** Until when the seat can be cancelled, already formatted. */
  deadline: string;
  onConfirm: () => void;
  onClose: () => void;
};
