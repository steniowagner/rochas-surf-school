import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { REGISTRATIONS_QUERY_KEY } from "@/modules/admin/utils/registrations-cache";
import { getSession } from "@/services/session/session.store";

import { refreshAccount } from "../utils/refresh-account";

/**
 * A push that arrives with the app open (shown as a banner by the push service) also updates what is on screen
 * (spec 020, D-16): a decision refreshes the account, so the flow guards move the app on by themselves, and a
 * new registration refreshes the admin's list, and a class assignment reloads the cached weeks, and an edited, unassigned or cancelled class reloads every cached class. No navigation.
 */
export const useNotificationReceived = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const type = notification.request.content.data?.type;

        if (type === "registration.pending") {
          void queryClient.invalidateQueries({
            queryKey: REGISTRATIONS_QUERY_KEY,
          });

          return;
        }

        if (type === "class.assigned") {
          void queryClient.invalidateQueries({
            queryKey: ["classes", "week"],
          });

          return;
        }

        // The weeks and the details of the class that changed.
        if (
          type === "class.edited" ||
          type === "class.unassigned" ||
          type === "class.cancelled" ||
          type === "class.deleted"
        ) {
          void queryClient.invalidateQueries({ queryKey: ["classes"] });

          return;
        }

        if (
          (type === "registration.approved" ||
            type === "registration.denied") &&
          getSession()
        ) {
          // Only an expired session makes it throw: useSessionExpired owns that case.
          refreshAccount().catch(() => {});
        }
      },
    );

    return () => subscription.remove();
  }, [queryClient]);
};
