import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { isOnboardingCompleted, resolveFlow } from "@/navigation/resolve-flow";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { SessionExpiredError } from "@/services/api";

import { useMarkAllNotificationsRead } from "../hooks/use-mark-all-notifications-read.hook";
import { useMarkNotificationRead } from "../hooks/use-mark-notification-read.hook";
import { useNotifications } from "../hooks/use-notifications.hook";
import { useUnreadNotificationsCount } from "../hooks/use-unread-notifications-count.hook";
import { NotificationItem } from "../notifications.types";
import { notificationTarget } from "../utils/notification-target";
import {
  NOTIFICATIONS_LIST_QUERY_KEY,
  NotificationsListData,
} from "../utils/notifications-cache";

import { UseNotificationsScreenResult } from "./notifications.screen.types";

export const useNotificationsScreen = (): UseNotificationsScreenResult => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();
  const { user } = useSession();
  const now = useNow();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useNotifications();
  const unread = useUnreadNotificationsCount();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // A list with no data goes back to pending when it is fetched again after an error: while "Try again" runs, the
  // error stays on screen with the spinner in its button.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;
  const hasRows = query.notifications.length > 0;

  const openNotification = (notification: NotificationItem) => {
    // A read row sends nothing; an unread one is marked at once, without waiting for the request (D-07).
    if (!notification.read) {
      markOne.mutate(notification.id);
    }

    const flow = user
      ? resolveFlow({ user, onboardingCompleted: isOnboardingCompleted(user) })
      : "auth";
    const target = notificationTarget(notification.type, notification.classId, flow);

    if (target !== null) {
      router.push(target);

      return;
    }

    // A new role starts at its flow's home: `index` redirects to the flow of the account (spec 058, D-13).
    if (notification.type === "role.changed") {
      router.replace(routes.home);
    }
  };

  const markAllRead = () =>
    markAll.mutate(undefined, {
      onError: (error) => {
        // An expired session is handled once, centrally.
        if (!(error instanceof SessionExpiredError)) {
          alertMessage.show(t("notifications.markAllError"));
        }
      },
    });

  const refresh = async () => {
    setIsRefreshing(true);
    // From page 1 again: the later pages load as the list is scrolled.
    queryClient.setQueryData<NotificationsListData>(
      NOTIFICATIONS_LIST_QUERY_KEY,
      (data) =>
        data && { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) },
    );
    try {
      await Promise.all([query.refetch(), unread.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return {
    now,
    notifications: query.notifications,
    isLoading: query.isPending && !isRetrying,
    // A failed refresh or next page keeps the rows; an expired session is handled once, centrally.
    isError:
      isRetrying ||
      (query.isError && !hasRows && !(query.error instanceof SessionExpiredError)),
    isEmpty: query.isSuccess && !hasRows,
    isRetrying,
    isRefreshing,
    isFetchingNextPage: query.isFetchingNextPage,
    showMarkAll: hasRows && unread.count > 0,
    retry: () => void query.refetch(),
    refresh,
    loadMore,
    openNotification,
    markAllRead,
  };
};
