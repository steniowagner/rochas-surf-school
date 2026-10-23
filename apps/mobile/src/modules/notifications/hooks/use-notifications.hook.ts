import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { apiGet } from "@/services/api";

import { NotificationItem, NotificationsPage } from "../notifications.types";
import {
  NOTIFICATIONS_LIST_QUERY_KEY,
  NOTIFICATIONS_PAGE_SIZE,
} from "../utils/notifications-cache";

/**
 * The person's notifications, newest first, 20 per page, written in the app's language (spec 055, D-10); a row
 * repeated across pages (a notification that arrived mid-scroll) is dropped.
 */
export const useNotifications = () => {
  const { i18n } = useTranslation();
  const locale = toBackendLocale(i18n.language as AppLocale);

  const query = useInfiniteQuery({
    queryKey: NOTIFICATIONS_LIST_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      apiGet<NotificationsPage>(
        `/notifications?page=${pageParam}&perPage=${NOTIFICATIONS_PAGE_SIZE}&locale=${locale}`,
        { authenticated: true },
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.perPage < last.total ? last.page + 1 : undefined,
    retry: false,
  });

  const seen = new Set<string>();
  const notifications: NotificationItem[] = [];

  for (const page of query.data?.pages ?? []) {
    for (const notification of page.items) {
      if (!seen.has(notification.id)) {
        seen.add(notification.id);
        notifications.push(notification);
      }
    }
  }

  return { ...query, notifications };
};
