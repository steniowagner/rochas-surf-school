import type { Locale } from "@/i18n/locales";

import type { ClassSummary } from "../class-summary-card/class-summary-card.types";

export type ClassMessagePerson = {
  id: string;
  /** The name, or "Ex-aluno" for an erased person. */
  label: string;
  erased: boolean;
  role: "instructor" | "student" | "pending";
};

export type ClassMessageCardProps = ClassSummary & {
  locale: Locale;
  /** The instructors and the students with a seat who receive it, instructors first. */
  people: ClassMessagePerson[];
  /** The list of the people opened under the summary row. */
  expanded?: boolean;
};
