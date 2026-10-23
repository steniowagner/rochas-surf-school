import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { UnreadNotificationsCount } from "../notifications.types";
import {
  markReadInPages,
  NOTIFICATIONS_LIST_QUERY_KEY,
  NotificationsListData,
  UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
} from "../utils/notifications-cache";

/**
 * Marks one notification read: its row and the badge change at once, before the request answers (spec 055, D-07).
 * A failure is silent; the count is reloaded either way and the list shows the stored state on its next load.
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (id: string) =>
      apiPost<void>(`/notifications/${id}/read`, undefined, { authenticated: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY });

      const list = queryClient.getQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY);
      const wasUnread = (list?.pages ?? []).some((page) =>
        page.items.some((item) => item.id === id && !item.read),
      );

      queryClient.setQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY, (data) =>
        markReadInPages(data, (item) => item.id === id),
      );

      if (wasUnread) {
        queryClient.setQueryData<UnreadNotificationsCount>(
          UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
          (data) => data && { count: Math.max(0, data.count - 1) },
        );
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY }),
  });
};
