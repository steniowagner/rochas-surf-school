import type { Locale } from "@/i18n/locales";

/** `ready`: the rules in order; `addSheet`, `editSheet` and `deleteSheet` over them; `empty`, `loading` and `error`. */
export type ManageSchoolRulesState = "ready" | "addSheet" | "editSheet" | "deleteSheet" | "empty" | "loading" | "error";

export type ManageSchoolRulesScreenProps = {
  locale: Locale;
  state: ManageSchoolRulesState;
  /** The school's rules, as the school wrote them (spec 073 D-04). */
  rules: { title: string; description: string }[];
};
