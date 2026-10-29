import type { Locale } from "@/i18n/locales";

export type CancelSeatSheetProps = {
  locale: Locale;
  /** "qua, 9 set às 08:00": when the seat can be cancelled until. */
  deadline: string;
  loading?: boolean;
};
