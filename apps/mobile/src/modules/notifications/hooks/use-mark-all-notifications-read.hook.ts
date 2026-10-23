import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { UnreadNotificationsCount } from "../notifications.types";
import {
  markReadInPages,
  NOTIFICATIONS_LIST_QUERY_KEY,
  NotificationsListData,
  UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
} from "../utils/notifications-cache";

type MarkAllContext = {
  list: NotificationsListData | undefined;
  count: UnreadNotificationsCount | undefined;
};

/**
 * Marks every notification read: every row and the badge change at once, and a failure puts the previous state
 * back (spec 055, D-12); telling the person is the screen's job. The count is reloaded either way.
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void, MarkAllContext>({
    retry: false,
    mutationFn: () =>
      apiPost<void>("/notifications/read-all", undefined, { authenticated: true }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_LIST_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY });

      const context = {
        list: queryClient.getQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY),
        count: queryClient.getQueryData<UnreadNotificationsCount>(
          UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
        ),
      };

      queryClient.setQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY, (data) =>
        markReadInPages(data, () => true),
      );
      queryClient.setQueryData<UnreadNotificationsCount>(
        UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
        (data) => data && { count: 0 },
      );

      return context;
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(NOTIFICATIONS_LIST_QUERY_KEY, context?.list);
      queryClient.setQueryData(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY, context?.count);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY }),
  });
};
