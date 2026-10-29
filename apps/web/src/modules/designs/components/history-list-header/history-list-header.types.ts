export type HistoryListHeaderProps = {
  title: string;
  /** The period's caption, at the right while no day is selected. */
  caption: string;
  /** The selected day: shown as a clearable chip in place of the caption. */
  dayLabel: string | null;
  clearDayLabel: string;
};
