import type { Locale } from "@/i18n/locales";

import type { RoleAction } from "../person-role-actions/person-role-actions.types";
import type { PersonRole } from "../person-row/person-row.types";

export type PersonSheetProps = {
  locale: Locale;
  name: string;
  role: PersonRole;
  /** The WhatsApp number as shown ("+55 85 99999 8888"), or `null` when the person doesn't share it. */
  whatsapp: string | null;
  /** Shown only where the app passes it (the student's own people list doesn't). */
  email?: string;
  /** The role actions below the contact row: only the admin's People screen sets it. */
  canChangeRole?: boolean;
  /** The "Também é instrutor" row: an admin viewing an admin; `true` draws it checked. */
  instructorFlag?: boolean;
  /** The sheet's second step, in place of the details: a role change or the removal. */
  step?: { roleAction: RoleAction } | "remove";
};
