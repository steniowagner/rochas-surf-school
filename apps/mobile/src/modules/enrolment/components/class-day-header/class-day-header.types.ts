import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type ClassDayHeaderProps = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: string;
  endsAt: string;
  locationName: string;
  /** Adds the year under the day, next to the month, which then reads in lowercase. */
  showYear?: boolean;
};

export type UseClassDayHeaderProps = Pick<
  ClassDayHeaderProps,
  "startsAt" | "endsAt" | "showYear"
>;
