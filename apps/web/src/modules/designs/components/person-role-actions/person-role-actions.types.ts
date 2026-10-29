import type { Locale } from "@/i18n/locales";

import type { AppIconName } from "../app-icon";
import type { PersonRole } from "../person-row/person-row.types";

export type RoleAction = "promoteInstructor" | "promoteAdmin" | "demoteStudent" | "adminToInstructor";

export type RoleActionLook = { icon: AppIconName; danger: boolean };

export type PersonRoleActionsProps = {
  locale: Locale;
  /** The role of the person on the sheet: it decides which actions show. */
  role: PersonRole;
};
