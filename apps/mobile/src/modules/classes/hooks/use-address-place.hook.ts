import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { apiGet } from "@/services/api";

import { AddressPlace } from "../classes.types";

/** The place behind a picked suggestion, in the session of the suggestions. Errors are the caller's to ignore. */
export const useAddressPlace = (sessionToken: string) => {
  const { i18n } = useTranslation();
  const language = toBackendLocale(i18n.language as AppLocale);

  return useMutation({
    retry: false,
    mutationFn: (placeId: string) =>
      apiGet<AddressPlace>(
        `/locations/address-suggestions/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&language=${language}`,
        { authenticated: true },
      ),
  });
};
