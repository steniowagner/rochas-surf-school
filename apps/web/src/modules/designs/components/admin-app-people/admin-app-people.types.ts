import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

export type AdminAppPeopleProps = {
  locale: Locale;
  text: Dictionary["adminApp"];
};
