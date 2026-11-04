import type { Locale } from "@/i18n/locales";

/**
 * `ready`: the intro and the requests; `denySheet` and `approveSheet` (the reactivate confirmation) over them; `empty`,
 * `loading` and `error` keep the title in the header.
 */
export type ReactivationsState = "ready" | "denySheet" | "approveSheet" | "empty" | "loading" | "error";

export type ReactivationsScreenProps = {
  locale: Locale;
  state: ReactivationsState;
};
