import type { Locale } from "@/i18n/locales";

/** `surf`: its rule written; `skateEmpty`: skate's rule not written yet (the form, blank); `loading` and `error` keep the title in the header. */
export type CancellationRulesState = "surf" | "skateEmpty" | "loading" | "error";

export type CancellationRulesScreenProps = {
  locale: Locale;
  state: CancellationRulesState;
  /** The surf rule as the school wrote it (spec 073 D-04). */
  surfRule: string;
};
