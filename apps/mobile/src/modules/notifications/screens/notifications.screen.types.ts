import type { NotificationItem } from "../notifications.types";

export type UseNotificationsScreenResult = {
  now: Date;
  notifications: NotificationItem[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  isRetrying: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  /** "Mark all as read" shows only while something is unread and the list is on screen. */
  showMarkAll: boolean;
  retry: () => void;
  refresh: () => Promise<void>;
  loadMore: () => void;
  openNotification: (notification: NotificationItem) => void;
  markAllRead: () => void;
};
