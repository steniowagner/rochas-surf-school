import type { Locale } from "@/i18n/locales";

import type { ClassCardEnrolmentKey } from "../class-card/class-card.types";

export type EnrolmentBannerProps = {
  locale: Locale;
  status: ClassCardEnrolmentKey;
  /** The school's reason, for a student who was taken out: text typed by the school. */
  reason?: string;
  /** The denied banner opens the reason. */
  pressable?: boolean;
};
