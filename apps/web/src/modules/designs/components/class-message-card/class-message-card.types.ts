import type { Locale } from "@/i18n/locales";

export type ClassMessagePerson = {
  id: string;
  /** The name, or "Ex-aluno" for an erased person. */
  label: string;
  erased: boolean;
  role: "instructor" | "student" | "pending";
};

export type ClassMessageCardProps = {
  locale: Locale;
  discipline: "surf" | "skate";
  level: "beginner" | "advanced" | "expert";
  /** "Quarta, 9 set". */
  dateLabel: string;
  /** "08:00 – 09:30". */
  timeRange: string;
  locationName: string;
  /** The instructors and the students with a seat who receive it, instructors first. */
  people: ClassMessagePerson[];
  /** The list of the people opened under the summary row. */
  expanded?: boolean;
};
