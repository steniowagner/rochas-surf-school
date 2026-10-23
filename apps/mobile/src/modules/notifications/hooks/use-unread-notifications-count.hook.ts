import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { UnreadNotificationsCount } from "../notifications.types";
import { UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY } from "../utils/notifications-cache";

/** How many of the person's notifications are unread, for the bell's badge (spec 055, D-09); 0 while unknown. */
export const useUnreadNotificationsCount = () => {
  const query = useQuery({
    queryKey: UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
    queryFn: () =>
      apiGet<UnreadNotificationsCount>("/notifications/unread-count", {
        authenticated: true,
      }),
    retry: false,
  });

  // A failed count shows no badge rather than an old number.
  const count = query.isError ? 0 : (query.data?.count ?? 0);

  return { ...query, count };
};
