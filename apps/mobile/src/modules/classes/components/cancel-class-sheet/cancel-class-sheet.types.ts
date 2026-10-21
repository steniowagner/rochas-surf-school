export type CancelClassSheetProps = {
  visible: boolean;
  loading: boolean;
  /** How many trial guests the class has: they get no notice, so the sheet warns the admin. */
  guestCount?: number;
  /** The trimmed message, or `undefined` when it is blank. */
  onConfirm: (message: string | undefined) => void;
  onClose: () => void;
};

export type UseCancelClassSheetProps = Pick<
  CancelClassSheetProps,
  "visible" | "onConfirm" | "onClose"
>;
