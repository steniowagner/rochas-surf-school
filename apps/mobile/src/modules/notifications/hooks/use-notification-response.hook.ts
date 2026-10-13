import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { routes } from "@/constants/routes";
import { isOnboardingCompleted, resolveFlow } from "@/navigation/resolve-flow";
import { useSession } from "@/providers/session";
import { getSession } from "@/services/session/session.store";

import { refreshAccount } from "../utils/refresh-account";

const handle = async (response: Notifications.NotificationResponse) => {
  const { data } = response.notification.request.content;
  const session = getSession();
  let user = session?.user ?? null;

  if (session) {
    try {
      user = (await refreshAccount()) ?? user;
    } catch {
      // Only an expired session throws: useSessionExpired sends the person to sign-in.
      return;
    }
  }

  const flow = user
    ? resolveFlow({ user, onboardingCompleted: isOnboardingCompleted(user) })
    : "auth";

  if (data?.type === "registration.pending" && flow === "admin") {
    router.push(routes.admin.registrations);

    return;
  }

  // Access is decided only by resolveFlow: `index` redirects to the flow of the (refreshed) account.
  router.replace(routes.home);
};

/**
 * A tap on a push opens the screen that matches the account's current state (spec 020, D-15): the tap that
 * launched the app is read once the session is restored, and a response already handled is ignored.
 */
export const useNotificationResponse = () => {
  const { isRestoring } = useSession();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const handleOnce = (response: Notifications.NotificationResponse) => {
      const { content, identifier } = response.notification.request;
      const id = String(content.data?.notificationId ?? identifier);

      if (handled.current.has(id)) {
        return;
      }

      handled.current.add(id);
      void handle(response);
    };

    const launched = Notifications.getLastNotificationResponse();

    if (launched) {
      handleOnce(launched);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleOnce);

    return () => subscription.remove();
  }, [isRestoring]);
};
