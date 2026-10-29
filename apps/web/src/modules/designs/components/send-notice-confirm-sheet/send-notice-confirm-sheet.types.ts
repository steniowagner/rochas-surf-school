import type { Locale } from "@/i18n/locales";

export type SendNoticeConfirmSheetProps = {
  locale: Locale;
  /** Who receives it: the audience of a notice, or the class's people for a class message. */
  description: string;
  count: number;
  /** The notice as it will be sent, shown in the preview card. */
  title: string;
  message: string;
};
