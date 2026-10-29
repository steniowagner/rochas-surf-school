import type { Locale } from "@/i18n/locales";

/** `ready`: the intro and the requests; `denySheet` over them; `empty`, `loading` and `error` keep the title in the header. */
export type ReactivationsState = "ready" | "denySheet" | "empty" | "loading" | "error";

export type ReactivationsScreenProps = {
  locale: Locale;
  state: ReactivationsState;
};
