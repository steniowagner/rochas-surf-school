import type { Locale } from "@/i18n/locales";

export type ReactivationState = "notRequested" | "requesting" | "error" | "requested" | "denied" | "deniedWithoutReason";

export type ReactivationScreenProps = {
  locale: Locale;
  state: ReactivationState;
  /** The admin's reason of the denial: text typed by the school, not app copy. */
  reason: string;
};
