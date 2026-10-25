import type { CancellationDiscipline } from "../cancellation-rules.types";

export type Drafts = Partial<Record<CancellationDiscipline, string>>;

export type CancellationRulesNote = "unsaved" | "inForce" | "none";

export type UseCancellationRulesScreenResult = {
  status: "loading" | "error" | "ready";
  /** True while the retry of a failed load runs. */
  isRetrying: boolean;
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
