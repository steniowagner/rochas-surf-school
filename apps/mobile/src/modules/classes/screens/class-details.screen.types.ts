export type ClassDetailsInstructor = {
  id: string;
  name: string;
  /** The signed-in viewer teaches the class: shown as "You". */
  isViewer: boolean;
};

export type ClassDetailsScreenProps = {
  /** Admins only: shows the pencil that opens the class for editing (unless it has finished). */
  canEdit?: boolean;
  /** Students only: the request button, its sheets and the banner of the viewer's own enrolment. */
  canEnrol?: boolean;
};

export type UseClassDetailsScreenProps = Required<ClassDetailsScreenProps>;

export type DeleteSheetVariant = "confirm" | "notEmpty";

/** The flows that open a class: each has its own school rules screen. */
export type ClassDetailsRole = "student" | "instructor" | "admin";
