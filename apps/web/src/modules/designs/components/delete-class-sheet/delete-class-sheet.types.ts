import type { Locale } from "@/i18n/locales";

import type { ClassSummary } from "../class-summary-card/class-summary-card.types";

export type DeleteClassSheetProps = {
  locale: Locale;
  /** `confirm` asks to delete; `notEmpty` says the class has people and offers to cancel it instead. */
  variant: "confirm" | "notEmpty";
  classSummary: ClassSummary;
};
