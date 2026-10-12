import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/providers/session";
import { apiGet } from "@/services/api";

import { SchoolSettings } from "./use-school-whatsapp.types";

export const SCHOOL_SETTINGS_QUERY_KEY = ["school-settings"];

/**
 * The school's WhatsApp number (E.164), or null while it loads, when it fails and when the school has none: the
 * contact button is an extra, so every failure just hides it (spec 016, D-03).
 */
export const useSchoolWhatsapp = (): string | null => {
  const { tokens } = useSession();

  const { data } = useQuery({
    queryKey: SCHOOL_SETTINGS_QUERY_KEY,
    queryFn: () =>
      apiGet<SchoolSettings>("/school-settings", {
        accessToken: tokens?.accessToken,
      }),
    retry: false,
  });

  return data?.whatsappNumber ?? null;
};
