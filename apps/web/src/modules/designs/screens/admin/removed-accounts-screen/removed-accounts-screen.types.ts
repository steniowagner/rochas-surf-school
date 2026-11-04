import type { Locale } from "@/i18n/locales";

/**
 * `ready`: the intro and the removed accounts; `restoreSheet` (the restore confirmation) over them; `empty`, `loading`
 * and `error` keep the title in the header.
 */
export type RemovedAccountsState = "ready" | "restoreSheet" | "empty" | "loading" | "error";

export type RemovedAccountsScreenProps = {
  locale: Locale;
  state: RemovedAccountsState;
};
