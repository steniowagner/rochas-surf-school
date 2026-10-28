import { useQueries } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { NOTICE_AUDIENCES } from "../notices.constants";
import { NoticeRecipientsCount } from "../notices.types";

/**
 * How many people a notice to each audience would reach (spec 063, D-06): the three counts are read once, when the
 * screen opens, and reused while it stays open, so switching audiences never waits. Leaving the screen drops them, and
 * the next visit reads them again. Sending resolves the recipients on its own.
 */
export const useNoticeRecipientsCounts = (enabled = true) =>
  useQueries({
    queries: NOTICE_AUDIENCES.map((audience) => ({
      // Off in the class mode (spec 069), which reaches the class's people instead of an audience.
      enabled,
      queryKey: ["notices", "recipients", audience],
      queryFn: () =>
        apiGet<NoticeRecipientsCount>(
          `/notifications/broadcast/recipients?audience=${audience}`,
          { authenticated: true },
        ),
      retry: false,
      // Read on every visit, never again while the screen stays open, and dropped when it closes.
      refetchOnMount: "always" as const,
      staleTime: Infinity,
      gcTime: 0,
    })),
  });
