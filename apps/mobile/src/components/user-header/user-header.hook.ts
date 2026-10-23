import { Href, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useUnreadNotificationsCount } from "@/modules/notifications/hooks/use-unread-notifications-count.hook";
import { useSession } from "@/providers/session";
import { getGreetingPeriod } from "@/utils/greeting-period";

// Each role's "Avisos", above its tabs (spec 055, D-05).
const NOTIFICATIONS_ROUTES: Record<string, Href> = {
  student: routes.student.notifications,
  instructor: routes.instructor.notifications,
  admin: routes.admin.notifications,
};

export const useUserHeader = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  // Refreshed every minute, so the greeting changes while the tab stays open.
  const now = useNow();
  const name = user?.name.trim() ?? "";
  const { count, refetch } = useUnreadNotificationsCount();

  // Back on the home screen (after reading notifications above it, say) the badge shows the new count; a request
  // already running is reused.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const openNotifications = () => {
    const route = user ? NOTIFICATIONS_ROUTES[user.role] : undefined;

    if (route) {
      router.push(route);
    }
  };

  return {
    name,
    firstName: name.split(/\s+/)[0],
    greetingPeriod: getGreetingPeriod(now),
    unreadCount: count,
    notificationsLabel:
      count > 0
        ? t("userHeader.notificationsUnread", { count })
        : t("userHeader.notifications"),
    openNotifications,
  };
};
