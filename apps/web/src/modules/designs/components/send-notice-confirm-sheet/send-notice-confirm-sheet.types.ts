import type { Locale } from "@/i18n/locales";

import type { ClassSummary } from "../class-summary-card/class-summary-card.types";

export type SendNoticeConfirmSheetProps = {
  locale: Locale;
  /** The class a class message goes to; a notice has none. */
  classSummary?: ClassSummary;
  /** Who receives it: the audience of a notice, or the class's people for a class message. */
  description: string;
  count: number;
  /** The notice as it will be sent, shown in the preview card. */
  title: string;
  message: string;
};
