import type { Locale } from "@/i18n/locales";

export type PersonRole = "student" | "instructor" | "admin";

export type PersonRowProps = {
  locale: Locale;
  name: string;
  role: PersonRole;
  /** "jul 2026" */
  since: string;
  isFirst?: boolean;
  isLast?: boolean;
};
