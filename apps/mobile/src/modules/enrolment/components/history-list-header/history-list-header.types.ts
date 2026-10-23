export type HistoryListHeaderProps = {
  /** "Todas as aulas". */
  title: string;
  /** The period on screen, shown at the right while no day is selected: "OUTUBRO 2026", "12 – 18 OUT". */
  caption: string;
  /** The selected day, "14 AGO": replaces the caption with a chip that clears it. */
  dayLabel: string | null;
  /** The chip's accessibility label. */
  clearDayLabel: string;
  onClearDay: () => void;
};
