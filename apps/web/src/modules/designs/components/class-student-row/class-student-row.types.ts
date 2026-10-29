export type ClassStudentRowProps = {
  /** The name, or "Former student". */
  name: string;
  /** An erased account: the row can't be pressed. */
  erased?: boolean;
  /** Admins only, on a class that hasn't started: the label of the "Retirar" button that replaces the chevron (not on an erased row). */
  takeOutLabel?: string;
};
