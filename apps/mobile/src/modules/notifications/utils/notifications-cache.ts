import type { InfiniteData } from "@tanstack/react-query";

import type { NotificationItem, NotificationsPage } from "../notifications.types";

export const NOTIFICATIONS_PAGE_SIZE = 20;

export const NOTIFICATIONS_LIST_QUERY_KEY = ["notifications", "list"] as const;

export const UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export type NotificationsListData = InfiniteData<NotificationsPage, number>;

/** The cached pages with the notifications `isMarked` picks shown as read. */
export const markReadInPages = (
  data: NotificationsListData | undefined,
  isMarked: (item: NotificationItem) => boolean,
): NotificationsListData | undefined =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        !item.read && isMarked(item) ? { ...item, read: true } : item,
      ),
    })),
  };
