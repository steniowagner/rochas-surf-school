import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { useAlertMessage } from "@/providers/alert-message";
import { apiPut } from "@/services/api";
import {
  readPushEnabledPreference,
  writePushEnabledPreference,
} from "@/services/preferences/preferences.storage";
import {
  getPushToken,
  isPushPermissionDenied,
  setRegisteredPushToken,
} from "@/services/push/push.service";

import { unregisterPushToken } from "../utils/unregister-push-token";

/**
 * The phone's push switch (spec 026, D-10). Off stores the choice and removes this phone's token; on stores it and
 * registers at once, and when the OS permission ends up denied it goes back to off with a toast.
 */
export const usePushPreference = () => {
  const { t, i18n } = useTranslation();
  const alertMessage = useAlertMessage();
  const [enabled, setEnabledState] = useState(readPushEnabledPreference);

  const turnOff = () => {
    writePushEnabledPreference(false);
    setEnabledState(false);
  };

  const setEnabled = async (value: boolean) => {
    if (!value) {
      turnOff();
      await unregisterPushToken();

      return;
    }

    writePushEnabledPreference(true);
    setEnabledState(true);

    const token = await getPushToken();

    if (!token) {
      if (await isPushPermissionDenied()) {
        turnOff();
        alertMessage.show(t("profile.pushDenied"));
      }

      return;
    }

    try {
      await apiPut(
        "/notifications/push-token",
        { token, locale: toBackendLocale(i18n.language as AppLocale) },
        { authenticated: true },
      );
      setRegisteredPushToken(token);
    } catch {
      // Registered again at the next launch or sign-in.
    }
  };

  return { enabled, setEnabled };
};
