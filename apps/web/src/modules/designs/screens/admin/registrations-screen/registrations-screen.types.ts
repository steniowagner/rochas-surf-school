import type { Locale } from "@/i18n/locales";

/** `ready`: the intro and the new accounts; `denySheet` and `personSheet` over them; `empty`, `loading` and `error` keep the title in the header. */
export type RegistrationsState = "ready" | "denySheet" | "personSheet" | "empty" | "loading" | "error";

export type RegistrationsScreenProps = {
  locale: Locale;
  state: RegistrationsState;
};
