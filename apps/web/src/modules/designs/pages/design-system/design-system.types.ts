import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

export type DesignSystemPageProps = {
  locale: Locale;
  text: Dictionary["designSystem"];
};
