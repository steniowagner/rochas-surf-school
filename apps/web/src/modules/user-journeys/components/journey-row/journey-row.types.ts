import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

import type { JourneyResult } from "../../types/journey-progress.types";
import type { JourneyBoardRow } from "../../utils/journey-groups";

export type JourneyRowProps = {
  locale: Locale;
  row: JourneyBoardRow;
  result: JourneyResult | undefined;
  note: string;
  labels: Dictionary["userJourneys"]["labels"];
  /** Checking a result's box: the board sets it, or clears it when it is already the row's result. */
  onToggleResult: (rowId: string, result: JourneyResult) => void;
  onNoteChange: (rowId: string, note: string) => void;
};
