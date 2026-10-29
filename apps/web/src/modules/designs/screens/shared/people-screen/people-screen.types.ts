import type { Locale } from "@/i18n/locales";

export type PeopleState = "list" | "filtered" | "empty" | "loading" | "error" | "sheet" | "sheetNotShared" | "whatsappUnavailable";

export type PeopleScreenProps = {
  locale: Locale;
  state: PeopleState;
  /** Whose tab bar the screen sits on; the directory is the same for both (spec 074 D-02). */
  role?: "student" | "instructor";
};
