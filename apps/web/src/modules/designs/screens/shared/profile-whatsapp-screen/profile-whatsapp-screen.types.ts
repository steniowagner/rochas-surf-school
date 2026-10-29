import type { Locale } from "@/i18n/locales";

export type ProfileWhatsappState = "idle" | "invalidNumber" | "saving";

export type ProfileWhatsappScreenProps = {
  locale: Locale;
  state: ProfileWhatsappState;
};
