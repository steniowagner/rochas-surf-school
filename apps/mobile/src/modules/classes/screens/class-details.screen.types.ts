export type ClassDetailsInstructor = {
  id: string;
  name: string;
  /** Up to two letters, for the avatar. */
  initials: string;
  /** The signed-in viewer teaches the class: shown as "You". */
  isViewer: boolean;
};
