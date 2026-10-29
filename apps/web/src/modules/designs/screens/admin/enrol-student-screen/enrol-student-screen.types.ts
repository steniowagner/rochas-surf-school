import type { Locale } from "@/i18n/locales";

/**
 * The "Quem" step: `students` (the school's students), `studentChosen`, `noStudents` (a search with no match),
 * `studentsLoading` and `trial` (a trial class's guest). The "Aula" step: `classes` (today's), `noClasses` (a day
 * without any) and `classesLoading`.
 */
export type EnrolStudentState = "students" | "studentChosen" | "noStudents" | "studentsLoading" | "trial" | "classes" | "noClasses" | "classesLoading";

export type EnrolStudentScreenProps = {
  locale: Locale;
  state: EnrolStudentState;
};
