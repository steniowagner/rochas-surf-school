import type { Locale } from "@/i18n/locales";

export type EditProfileState = "idle" | "invalidName" | "saving";

export type EditProfileScreenProps = {
  locale: Locale;
  state: EditProfileState;
  /** Whose name and e-mail the form holds: the student's, the instructor's or the admin's mock account. */
  role?: "student" | "instructor" | "admin";
};
