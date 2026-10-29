import type { Locale } from "@/i18n/locales";

import type { PersonRole } from "../person-row/person-row.types";

export type ProfileHeaderProps = {
  locale: Locale;
  name: string;
  role: PersonRole;
};
