import type { Locale } from "@/i18n/locales";

export type DeleteClassSheetProps = {
  locale: Locale;
  /** `confirm` asks to delete; `notEmpty` says the class has people and offers to cancel it instead. */
  variant: "confirm" | "notEmpty";
  /** The class in one line: discipline, level, day, time and place. */
  classLine: string;
};
