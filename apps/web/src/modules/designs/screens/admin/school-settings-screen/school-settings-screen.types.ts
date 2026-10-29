import type { Locale } from "@/i18n/locales";

/** `ready`: the waiting list on; `waitingListOff`; `loading` and `error` keep the title in the header (the settings always exist). */
export type SchoolSettingsState = "ready" | "waitingListOff" | "loading" | "error";

export type SchoolSettingsScreenProps = {
  locale: Locale;
  state: SchoolSettingsState;
};
