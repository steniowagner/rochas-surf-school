import type { Locale } from "@/i18n/locales";

export type ClassesWeekState = "week" | "month" | "filterOpen" | "filtered" | "loading" | "empty" | "error";

export type ClassesWeekScreenProps = {
  locale: Locale;
  state: ClassesWeekState;
  /**
   * The student's Agenda: the user header and the calendar on the band, the cards with the student's enrolment. The
   * instructor's "Aulas" tab: the calendar at the top, today selected, the cards without an enrolment.
   */
  role?: "student" | "instructor";
};
