import type { Locale } from "@/i18n/locales";

import type { PersonRole } from "../person-row/person-row.types";

export type PersonSheetProps = {
  locale: Locale;
  name: string;
  role: PersonRole;
  /** The WhatsApp number as shown ("+55 85 99999 8888"), or `null` when the person doesn't share it. */
  whatsapp: string | null;
  /** Shown only where the app passes it (the student's own people list doesn't). */
  email?: string;
};
