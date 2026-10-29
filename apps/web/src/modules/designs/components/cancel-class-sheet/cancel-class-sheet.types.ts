import type { Locale } from "@/i18n/locales";

export type CancelClassSheetProps = {
  locale: Locale;
  /** How many trial guests the class has: they get no notice, so the sheet warns the admin. */
  guestCount?: number;
  /** The enrolled students who will be told. */
  studentCount?: number;
  /** The people with a pending request who will be told. */
  pendingCount?: number;
  /** The class's instructors, other than the admin, who will be told. */
  instructorCount?: number;
  /** The optional message, as typed. */
  message?: string;
};
