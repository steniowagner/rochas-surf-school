import type { Locale } from "@/i18n/locales";

export type ClassToolsDeleteState = "available" | "started" | "enrolled";

export type ClassToolsSheetProps = {
  locale: Locale;
  /** Who a message or a cancellation reaches: the instructors, the students and the pending requests, never the admin. */
  messageCount: number;
  /** Only a class that hasn't started and has nobody in it can be deleted. */
  deleteState: ClassToolsDeleteState;
};
