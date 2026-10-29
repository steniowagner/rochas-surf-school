import type { Locale } from "@/i18n/locales";

import type { PersonRole } from "../person-row/person-row.types";

export type RemoveConfirmationProps = {
  locale: Locale;
  /** A student's text is about seats, the others' about classes. */
  role: PersonRole;
  /** The person's first name, for the title. */
  name: string;
};
