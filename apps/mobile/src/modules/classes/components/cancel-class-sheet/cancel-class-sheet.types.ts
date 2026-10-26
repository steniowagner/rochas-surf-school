export type CancelClassSheetProps = {
  visible: boolean;
  loading: boolean;
  /** How many trial guests the class has: they get no notice, so the sheet warns the admin. */
  guestCount?: number;
  /** The enrolled students who will be told. */
  studentCount?: number;
  /** The people with a pending request who will be told. */
  pendingCount?: number;
  /** The class's instructors, other than the admin, who will be told. */
  instructorCount?: number;
  /** The trimmed message, or `undefined` when it is blank. */
  onConfirm: (message: string | undefined) => void;
  onClose: () => void;
};

export type UseCancelClassSheetProps = Pick<
  CancelClassSheetProps,
  | "visible"
  | "onConfirm"
  | "onClose"
  | "studentCount"
  | "pendingCount"
  | "instructorCount"
>;
