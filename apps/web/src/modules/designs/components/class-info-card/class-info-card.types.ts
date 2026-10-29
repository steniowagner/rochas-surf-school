import type { Locale } from "@/i18n/locales";

export type ClassInfoCardProps = {
  locale: Locale;
  variant: "started" | "finished" | "cancelled" | "noInstructor" | "noDeadline";
  /** "08:00" and "09:30", for the started and finished cards. */
  start?: string;
  end?: string;
  /** The message typed when the class was cancelled; the generic text without it. */
  message?: string;
  /** For the no-deadline card: which rule to check. */
  discipline?: "surf" | "skate";
};
