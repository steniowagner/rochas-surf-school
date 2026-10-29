import type { Locale } from "@/i18n/locales";

import type { PersonRole } from "../person-row/person-row.types";

export type RoleFiltersProps = {
  locale: Locale;
  /** The roles whose toggle is on. */
  selected: PersonRole[];
};
