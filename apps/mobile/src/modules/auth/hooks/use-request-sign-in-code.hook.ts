import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AppLocale } from "@/i18n/locales";
import { apiPost, ApiError } from "@/services/api";

type RequestSignInCodeVariables = {
  email: string;
};

// The backend's locales differ from the app's.
const backendLocaleByAppLocale: Record<AppLocale, string> = {
  "en-US": "en",
  "es-ES": "es",
  "pt-BR": "pt-BR",
};

const RESEND_TOO_SOON = "signInCode.resend.tooSoon";

export const useRequestSignInCode = () => {
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: async ({ email }: RequestSignInCodeVariables) => {
      const locale = backendLocaleByAppLocale[i18n.language as AppLocale];

      try {
        await apiPost("/auth/email/code", { email, locale });
      } catch (error) {
        // A valid code was already sent less than 30 s ago, so the person can go on with it.
        if (error instanceof ApiError && error.errors[0] === RESEND_TOO_SOON) {
          return;
        }

        throw error;
      }
    },
  });
};
