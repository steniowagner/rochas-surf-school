import type { Locale } from "@/i18n/locales";

/**
 * `ready`: the intro and the new accounts; `denySheet`, `approveSheet` (the approve confirmation) and `personSheet` over
 * them; `empty`, `loading` and `error` keep the title in the header.
 */
export type RegistrationsState = "ready" | "denySheet" | "approveSheet" | "personSheet" | "empty" | "loading" | "error";

export type RegistrationsScreenProps = {
  locale: Locale;
  state: RegistrationsState;
};
