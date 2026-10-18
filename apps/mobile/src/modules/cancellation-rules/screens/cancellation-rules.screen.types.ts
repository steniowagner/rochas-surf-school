import type { CancellationDiscipline } from "../cancellation-rules.types";

export type CancellationRulesNote = "unsaved" | "inForce" | "none";

export type UseCancellationRulesScreenResult = {
  status: "loading" | "error" | "ready";
  retry: () => void;
  discipline: CancellationDiscipline;
  setDiscipline: (discipline: CancellationDiscipline) => void;
  /** The draft of the selected discipline, or its saved text while untouched. */
  value: string;
  setValue: (value: string) => void;
  note: CancellationRulesNote;
  canSave: boolean;
  isSaving: boolean;
  save: () => void;
};
