import type { Locale } from "@/i18n/locales";

import type { ClassSummary } from "../class-summary-card/class-summary-card.types";

export type TakeOutSheetProps = {
  locale: Locale;
  /** A trial guest has no account and no one to tell: the sheet only confirms, with no reason. */
  trial?: boolean;
  /** The first name of the student (the whole name of a trial guest), in the title. */
  firstName: string;
  /** The class the student leaves. */
  classSummary: ClassSummary;
  /** The reason as typed. */
  reason?: string;
};
