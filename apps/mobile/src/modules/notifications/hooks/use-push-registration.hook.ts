import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { useSession } from "@/providers/session";
import { apiPut } from "@/services/api";
import { readPushEnabledPreference } from "@/services/preferences/preferences.storage";
import { getPushToken, setRegisteredPushToken } from "@/services/push/push.service";

import { unregisterPushToken } from "../utils/unregister-push-token";

const REGISTRABLE_STATUSES = ["pending", "approved", "deleted", "removed"];

/**
 * Sends this phone's push token to the backend (with the app language) for a pending, approved, deleted or removed account (a deleted one hears the answer to its reactivation request, a removed one hears of its restore), when
 * the session starts, the app launches with one, the account's status changes or the language changes. Pushes
 * are an extra: no token, or any failure, shows nothing (spec 020, D-12). While the person keeps pushes off
 * (spec 026), nothing is registered and the token is removed instead.
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

    // Pushes off on this phone: nothing is registered; a DELETE that failed earlier is sent again.
    if (!readPushEnabledPreference()) {
      void unregisterPushToken();

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
