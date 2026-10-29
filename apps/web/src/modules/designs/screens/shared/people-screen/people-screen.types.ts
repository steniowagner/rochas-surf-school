import type { Locale } from "@/i18n/locales";

export type PeopleState = "list" | "filtered" | "empty" | "loading" | "error" | "sheet" | "sheetNotShared" | "whatsappUnavailable";

/** The admin's sheets (spec 075): a student's, an instructor's and another admin's, with the role actions, and the second steps. */
export type AdminPeopleSheet = "student" | "instructor" | "admin" | "roleConfirm" | "removeConfirm";

export type PeopleScreenProps = {
  locale: Locale;
  state: PeopleState;
  /** Whose tab bar the screen sits on; the directory is the same for all (spec 074 D-02), with the admin among them on the admin's. */
  role?: "student" | "instructor" | "admin";
  /** The admin's person sheet open over the list (the app's `canChangeRole` and `canSetInstructorFlag`). */
  adminSheet?: AdminPeopleSheet;
};
