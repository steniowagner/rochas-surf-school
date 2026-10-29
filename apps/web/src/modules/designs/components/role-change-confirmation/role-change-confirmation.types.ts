import type { Locale } from "@/i18n/locales";

import type { RoleAction } from "../person-role-actions/person-role-actions.types";

export type RoleChangeConfirmationProps = {
  locale: Locale;
  action: RoleAction;
  /** The person's first name, for the title. */
  name: string;
  /** Adds the sentence about the seats and requests given up (a student made admin). */
  showSeatsNote: boolean;
};
