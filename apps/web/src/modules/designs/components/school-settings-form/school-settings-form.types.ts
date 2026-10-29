import type { Locale } from "@/i18n/locales";

export type SchoolSettingsFormProps = {
  locale: Locale;
  waitingListEnabled: boolean;
  /** The school's WhatsApp number, as typed after the dial code. */
  whatsapp: { country: string; dialCode: string; number: string };
  /** Save waits for a change. */
  canSave?: boolean;
};
