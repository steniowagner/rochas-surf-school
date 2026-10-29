import type { Locale } from "@/i18n/locales";

export type SchoolRulesReadState = "ready" | "loading" | "empty" | "error";

export type SchoolRulesReadScreenProps = {
  locale: Locale;
  state: SchoolRulesReadState;
  /** The school's rules: text typed by the school, not app copy. */
  rules: { title: string; description: string }[];
};
