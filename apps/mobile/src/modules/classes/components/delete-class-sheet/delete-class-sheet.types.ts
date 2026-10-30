import type { ClassSummary } from "../class-summary-card/class-summary-card.types";

export type DeleteClassSheetVariant = "confirm" | "notEmpty";

export type DeleteClassSheetProps = {
  visible: boolean;
  /** `confirm` asks to delete; `notEmpty` says the class has people and offers to cancel it instead. */
  variant: DeleteClassSheetVariant;
  /** The class in one line: discipline, level, day, time and place. */
  /** The class, once loaded. */
  classSummary: ClassSummary | null;
  loading: boolean;
  onConfirm: () => void;
  /** "Cancelar aula" of the `notEmpty` variant. */
  onCancelInstead: () => void;
  onClose: () => void;
};
