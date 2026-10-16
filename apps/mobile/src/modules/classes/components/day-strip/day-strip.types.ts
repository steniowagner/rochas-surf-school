export type DayStripProps = {
  /** The seven days of the week, `YYYY-MM-DD`, Monday first. */
  days: string[];
  /** The selected day. */
  selected: string;
  /** Today in America/Fortaleza. */
  today: string;
  /** How many classes each day has; days that are missing have none. */
  counts: Record<string, number>;
  onSelect: (day: string) => void;
};
