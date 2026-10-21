import { useSchoolSettings } from "./use-school-settings.hook";

/**
 * The school's WhatsApp number (E.164), or null while it loads, when it fails and when the school has none: the
 * contact button is an extra, so every failure just hides it (spec 016, D-03).
 */
export const useSchoolWhatsapp = (): string | null => {
  const { data } = useSchoolSettings();

  return data?.whatsappNumber ?? null;
};
