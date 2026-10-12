import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { GoogleSignin } from "@/services/google-sign-in";
import {
  acknowledgeExpired,
  getSnapshot,
  subscribe,
} from "@/services/session/session.store";

const selectExpired = () => getSnapshot().expired;

/**
 * Reacts to the backend refusing to renew the session: the store already cleared it, and the route guards send
 * the app to sign-in. This shows the message once, clears the cached server data and signs out of Google. No
 * request goes to the backend: it already refused the session (spec 018, D-08).
 */
export const useSessionExpired = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const expired = useSyncExternalStore(subscribe, selectExpired);

  useEffect(() => {
    if (!expired) {
      return;
    }

    acknowledgeExpired();
    alertMessage.show(t("session.expired"));
    queryClient.clear();
    GoogleSignin.signOut().catch(() => {});
  }, [expired, alertMessage, queryClient, t]);
};
