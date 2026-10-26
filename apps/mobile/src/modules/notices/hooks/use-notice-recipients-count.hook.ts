import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { NoticeAudience, NoticeRecipientsCount } from "../notices.types";

/** How many people a notice to the audience would reach now (spec 063, D-02): advisory, read again at each audience. */
export const useNoticeRecipientsCount = (audience: NoticeAudience) =>
  useQuery({
    queryKey: ["notices", "recipients", audience],
    queryFn: () =>
      apiGet<NoticeRecipientsCount>(
        `/notifications/broadcast/recipients?audience=${audience}`,
        { authenticated: true },
      ),
    retry: false,
    // A count that was true a minute ago may not be now: the screen always reads it fresh.
    gcTime: 0,
  });
