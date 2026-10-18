export type CancelClassSheetProps = {
  visible: boolean;
  loading: boolean;
  /** The trimmed message, or `undefined` when it is blank. */
  onConfirm: (message: string | undefined) => void;
  onClose: () => void;
};

export type UseCancelClassSheetProps = Pick<
  CancelClassSheetProps,
  "visible" | "onConfirm" | "onClose"
>;
