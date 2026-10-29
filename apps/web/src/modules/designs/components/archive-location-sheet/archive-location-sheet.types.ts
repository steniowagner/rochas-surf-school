import type { Locale } from "@/i18n/locales";

export type ArchiveLocationSheetProps = {
  locale: Locale;
  name: string;
  address: string;
  /** Classes that start later and use the location: the sheet says they stay as they are. */
  upcomingClasses: number;
};
