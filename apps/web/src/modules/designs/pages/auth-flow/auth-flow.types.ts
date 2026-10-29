import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

export type AuthFlowPageProps = {
  locale: Locale;
  text: Dictionary["authFlow"];
};
