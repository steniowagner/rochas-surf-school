import type { Href } from "expo-router";

export type ClassesWeekScreenProps = {
  /** The translation key of the title: the Agenda tab for students, the Aulas tab for the others. */
  titleKey: "tabs.agenda" | "tabs.classes";
  /** The route of a class's details for the viewer's role. */
  classRoute: (id: string) => Href;
  /** Admins only: the header's "+" and the empty day's "Criar aula", shown on today and later days. */
  canCreate?: boolean;
  /** Admins only: the cards' flags (the "no instructor" chip). */
  showFlags?: boolean;
  /** Students only: the cards' chip of the viewer's own enrolment. */
  showEnrolment?: boolean;
};

export type UseClassesWeekScreenProps = Pick<
  ClassesWeekScreenProps,
  "classRoute" | "canCreate"
>;
