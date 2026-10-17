export type ClassDetailsInstructor = {
  id: string;
  name: string;
  /** Up to two letters, for the avatar. */
  initials: string;
  /** The signed-in viewer teaches the class: shown as "You". */
  isViewer: boolean;
};

export type ClassDetailsScreenProps = {
  /** Admins only: shows the pencil that opens the class for editing (unless it has finished). */
  canEdit?: boolean;
};

export type UseClassDetailsScreenProps = Required<ClassDetailsScreenProps>;
