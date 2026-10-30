import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type ClassSummary = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  /** "Quarta-feira · 9 set". */
  dateLabel: string;
  /** "08:00 – 09:30". */
  timeRange: string;
  locationName: string;
};

export type ClassSummaryCardProps = ClassSummary & {
  /** Drops the card's own border, background and padding, to sit inside another card. */
  embedded?: boolean;
};
