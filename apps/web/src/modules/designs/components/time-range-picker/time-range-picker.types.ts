import type { Locale } from "@/i18n/locales";

export type TimeRangeChip = {
  /** "08:00 – 09:30". */
  label: string;
  selected: boolean;
  /** It overlaps a selected range (or, on the edit form's today, it has started): it can't be picked. */
  blocked: boolean;
};

export type TimeRangePickerProps = {
  locale: Locale;
  chips: TimeRangeChip[];
  /** The ranges come from last week's classes. */
  showSuggestionsHint: boolean;
  /** Today is among the dates: the ranges that passed have no class today. */
  showPastHint: boolean;
  /** A range is selected: overlapping ones can't join the batch. */
  showOverlapHint: boolean;
};
