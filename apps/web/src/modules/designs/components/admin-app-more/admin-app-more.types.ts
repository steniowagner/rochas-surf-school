import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

export type AdminAppMoreProps = {
  locale: Locale;
  text: Dictionary["adminApp"];
  /** The mock school rules, the ones of the auth flow page (spec 073 D-04). */
  schoolRules: Dictionary["authFlow"]["schoolRules"];
};
