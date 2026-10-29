import type { Dictionary } from "@/i18n/dictionary.types";

/** Where "Copy results" stands: nothing yet, copied (for 2 seconds) or refused by the clipboard. */
export type CopyState = "idle" | "copied" | "failed";

export type ResultsSummaryProps = {
  labels: Dictionary["userJourneys"]["labels"];
  name: string;
  /** The counter line, already filled in. */
  counter: string;
  copyState: CopyState;
  onNameChange: (name: string) => void;
  onCopy: () => void;
  onClear: () => void;
};
