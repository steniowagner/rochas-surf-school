import type { Locale } from "@/i18n/locales";

/** `ready`: the intro and the removed accounts; `empty`, `loading` and `error` keep the title in the header. */
export type RemovedAccountsState = "ready" | "empty" | "loading" | "error";

export type RemovedAccountsScreenProps = {
  locale: Locale;
  state: RemovedAccountsState;
};
