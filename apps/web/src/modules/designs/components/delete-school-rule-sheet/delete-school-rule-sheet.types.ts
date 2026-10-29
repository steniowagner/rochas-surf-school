import type { Locale } from "@/i18n/locales";

export type DeleteSchoolRuleSheetProps = {
  locale: Locale;
  /** The title of the rule to delete. */
  title: string;
};
