import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type DenialReasonSheetProps = {
  visible: boolean;
  discipline: ClassDiscipline;
  level: ClassLevel;
  /** The class start, "08:00". */
  start: string;
  /** The reason the admin wrote, or `null` when there is none. */
  reason: string | null;
  onClose: () => void;
};
