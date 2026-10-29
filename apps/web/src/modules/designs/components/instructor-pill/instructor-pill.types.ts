export type InstructorPillProps = {
  /** The instructor's name, or "Former instructor" for an erased one. */
  name: string;
  /** "Você": the signed-in viewer teaches the class, with a `lagoon` border. */
  viewerLabel?: string;
  /** An erased instructor: the person icon instead of the initials. */
  erased?: boolean;
};
