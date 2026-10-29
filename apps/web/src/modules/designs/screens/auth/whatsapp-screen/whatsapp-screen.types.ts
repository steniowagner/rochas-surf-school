import type { Locale } from "@/i18n/locales";

export type WhatsappState = "empty" | "filled" | "countryPicker" | "invalid" | "saving" | "saveError";

export type WhatsappScreenProps = {
  locale: Locale;
  state: WhatsappState;
};
