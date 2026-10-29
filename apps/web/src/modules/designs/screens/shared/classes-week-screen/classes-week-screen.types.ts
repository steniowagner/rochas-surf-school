import type { Locale } from "@/i18n/locales";

/** `pastEmpty` is the admin's: a past day with no classes, without the create action and the "+" button. */
export type ClassesWeekState = "week" | "month" | "filterOpen" | "filtered" | "loading" | "empty" | "pastEmpty" | "error";

export type ClassesWeekScreenProps = {
  locale: Locale;
  state: ClassesWeekState;
  /**
   * The student's Agenda: the user header and the calendar on the band, the cards with the student's enrolment. The
   * instructor's "Aulas" tab: the calendar at the top, today selected, the cards without an enrolment. The admin's: the
   * instructor's form under the "Aulas" title, with the "+" button and the empty day's create action on today and
   * later days, and the cards' flags (the app's `header="title"`, `canCreate` and `showFlags`).
   */
  role?: "student" | "instructor" | "admin";
};
