export type ClassStudentRowProps = {
  name: string;
  /** `null` shows the initials. */
  photoUrl: string | null;
  /** Pressing the row: opens the student's person sheet. */
  onPress: () => void;
  /** Admins only, on a class that hasn't started: a "Retirar" button replaces the chevron. */
  onTakeOut?: () => void;
};
