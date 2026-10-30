import type { ClassSummary } from "@/modules/classes/components/class-summary-card/class-summary-card.types";

export type TakeOutSheetProps = {
  visible: boolean;
  /** A trial guest has no account and no one to tell: the sheet only confirms, with no reason. */
  trial?: boolean;
  /** The first name of the student (the whole name of a trial guest), in the title. */
  firstName: string;
  /** "Surf Beginner · Tomorrow, 08:00 – 09:00": the class the student leaves. */
  /** The class the student leaves, once loaded. */
  classSummary: ClassSummary | null;
  loading: boolean;
  /** The reason as typed; blank means none. */
  onConfirm: (reason: string) => void;
  onClose: () => void;
};
