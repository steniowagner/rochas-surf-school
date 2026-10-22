import type { Href } from "expo-router";

export type ClassesWeekScreenProps = {
  /**
   * The translation key of the title (the Aulas tab). Without it the screen leaves the header to its stack: the
   * student's Agenda shows the user header there.
   */
  titleKey?: "tabs.classes";
  /** The route of a class's details for the viewer's role. */
  classRoute: (id: string) => Href;
  /** Admins only: the header's "+" and the empty day's "Criar aula", shown on today and later days. */
  canCreate?: boolean;
  /** Admins only: the cards' flags (the "no instructor" chip). */
  showFlags?: boolean;
  /** Students only: the cards' chip of the viewer's own enrolment. */
  showEnrolment?: boolean;
  /**
   * Students only (the Agenda): the calendar on the `band` color, continuing the user header's, with a
   * `band-line` border under it (AGENDA-01 / 01A).
   */
  banded?: boolean;
};

export type UseClassesWeekScreenProps = Pick<
  ClassesWeekScreenProps,
  "classRoute" | "canCreate"
>;
