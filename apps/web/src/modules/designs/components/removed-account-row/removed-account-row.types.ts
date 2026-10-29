import type { Locale } from "@/i18n/locales";

import type { PersonRole } from "../person-row/person-row.types";

export type RemovedAccountRowProps = {
  locale: Locale;
  name: string;
  role: PersonRole;
  /** The day it was removed, as "2 de set.", and the day it is deleted for good. */
  removedOn: string;
  deletedOn: string;
};
