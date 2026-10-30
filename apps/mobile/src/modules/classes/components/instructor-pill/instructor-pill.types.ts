export type InstructorPillProps = {
  /** The instructor's name, or "Former instructor" for an erased one. */
  name: string;
  photoUrl: string | null;
  /** The signed-in viewer teaches the class: reads "You" with a `lagoon` border. */
  isViewer: boolean;
  /** Without it the pill can't be pressed (an erased instructor has no sheet to open). */
  onPress?: () => void;
  /** An erased instructor: the person icon instead of the initials. */
  erased?: boolean;
};
