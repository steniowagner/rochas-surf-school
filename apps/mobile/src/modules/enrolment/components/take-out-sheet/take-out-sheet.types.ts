export type TakeOutSheetProps = {
  visible: boolean;
  /** The first name of the student, in the title. */
  firstName: string;
  /** "Surf Beginner · Tomorrow, 08:00 – 09:00": the class the student leaves. */
  summary: string;
  loading: boolean;
  /** The reason as typed; blank means none. */
  onConfirm: (reason: string) => void;
  onClose: () => void;
};
