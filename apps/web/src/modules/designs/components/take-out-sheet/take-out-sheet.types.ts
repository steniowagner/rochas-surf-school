import type { Locale } from "@/i18n/locales";

export type TakeOutSheetProps = {
  locale: Locale;
  /** A trial guest has no account and no one to tell: the sheet only confirms, with no reason. */
  trial?: boolean;
  /** The first name of the student (the whole name of a trial guest), in the title. */
  firstName: string;
  /** "Surf Iniciante · Quarta · 9 set, 08:00 – 09:30": the class the student leaves. */
  summary: string;
  /** The reason as typed. */
  reason?: string;
};
