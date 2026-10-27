export type ClassStudentRowProps = {
  /** The student's name, or "Former student" for an erased one. */
  name: string;
  /** `null` shows the initials. */
  photoUrl: string | null;
  /** Pressing the row: opens the student's person sheet. Without it the row can't be pressed and has no chevron. */
  onPress?: () => void;
  /** An erased student: the person icon instead of the photo or initials. */
  erased?: boolean;
  /** Admins only, on a class that hasn't started: a "Retirar" button replaces the chevron. */
  onTakeOut?: () => void;
};
