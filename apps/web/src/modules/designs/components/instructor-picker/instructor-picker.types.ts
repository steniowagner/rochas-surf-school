import type { Locale } from "@/i18n/locales";

export type InstructorPickerProps = {
  locale: Locale;
  /** Every approved instructor and admin. */
  teachers: { id: string; name: string }[];
  selectedIds: string[];
  /** The spinner while they load. */
  loading?: boolean;
  /** The error with its retry button. */
  error?: boolean;
};
