import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { useSession } from "@/providers/session";
import { apiPut } from "@/services/api";
import { getPushToken, setRegisteredPushToken } from "@/services/push/push.service";

const REGISTRABLE_STATUSES = ["pending", "approved"];

/**
 * Sends this phone's push token to the backend (with the app language) for a pending or approved account, when
 * the session starts, the app launches with one, the account's status changes or the language changes. Pushes
 * are an extra: no token, or any failure, shows nothing (spec 020, D-12).
 */
export const usePushRegistration = () => {
  const { user } = useSession();
  const { i18n } = useTranslation();
  const userId = user?.id;
  const status = user?.status;
  const language = i18n.language as AppLocale;

  useEffect(() => {
    if (!userId || !status || !REGISTRABLE_STATUSES.includes(status)) {
      return;
    }

    let cancelled = false;

    const register = async () => {
      try {
        const token = await getPushToken();

        if (!token || cancelled) {
          return;
        }

        await apiPut(
          "/notifications/push-token",
          { token, locale: toBackendLocale(language) },
          { authenticated: true },
        );
        setRegisteredPushToken(token);
      } catch {
        // Nothing to show: the account state is still read on launch.
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, [userId, status, language]);
};
