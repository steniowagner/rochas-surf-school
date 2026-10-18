import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { apiGet } from "@/services/api";

import { AddressSuggestionsResponse } from "../classes.types";

import { useDebouncedValue } from "./use-debounced-value.hook";

export const SUGGESTIONS_DEBOUNCE_MS = 300;
export const SUGGESTIONS_MIN_LENGTH = 3;

/**
 * Address suggestions for what the admin types: 300 ms after the last keystroke, from 3 characters, one session token
 * per opening of the sheet (Google bills by session). No retry; a failure shows no suggestions and no toast.
 */
export const useAddressSuggestions = (text: string, sessionToken: string) => {
  const { i18n } = useTranslation();
  const language = toBackendLocale(i18n.language as AppLocale);
  const query = useDebouncedValue(text.trim(), SUGGESTIONS_DEBOUNCE_MS);

  return useQuery({
    queryKey: ["locations", "suggestions", sessionToken, query],
    enabled: query.length >= SUGGESTIONS_MIN_LENGTH,
    retry: false,
    staleTime: Infinity,
    queryFn: () =>
      apiGet<AddressSuggestionsResponse>(
        `/locations/address-suggestions?q=${encodeURIComponent(query)}&sessionToken=${encodeURIComponent(sessionToken)}&language=${language}`,
        { authenticated: true },
      ),
  });
};
