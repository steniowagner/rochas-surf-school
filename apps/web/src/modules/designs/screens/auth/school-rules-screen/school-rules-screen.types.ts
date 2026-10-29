import type { Locale } from "@/i18n/locales";

export type SchoolRulesState = "loading" | "loaded" | "accepted" | "loadError" | "empty" | "outdated";

export type SchoolRulesScreenProps = {
  locale: Locale;
  state: SchoolRulesState;
  /** `rulesUpdate` for the screen shown when the school changed its rules; `onboarding` for the last step of the sign-up. */
  variant?: "onboarding" | "rulesUpdate";
  /** The school's rules: text typed by the school, not app copy. */
  rules: { title: string; description: string }[];
};
