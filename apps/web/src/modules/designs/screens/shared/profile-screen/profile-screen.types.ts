import type { Locale } from "@/i18n/locales";

export type ProfileState =
  | "profile"
  | "pushDenied"
  | "languageSheet"
  | "themeSheet"
  | "aboutSheet"
  | "signOutSheet"
  | "deleteSheet"
  | "removing"
  | "rules"
  | "rulesLoading"
  | "rulesEmpty"
  | "rulesError";

export type ProfileScreenProps = {
  locale: Locale;
  state: ProfileState;
  /** The cancellation rules, as the school wrote them (mock text, spec 073 D-04). */
  rules: { surf: string; skate: string };
  /** The role under the name and the tab bar; the rest of the profile is the same for all (spec 074 D-02). */
  role?: "student" | "instructor" | "admin";
};
