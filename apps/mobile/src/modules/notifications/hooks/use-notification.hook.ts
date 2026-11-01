import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { toBackendLocale } from "@/i18n/backend-locale";
import type { AppLocale } from "@/i18n/locales";
import { apiGet } from "@/services/api";

import { NotificationItem } from "../notifications.types";
import { notificationQueryKey } from "../utils/notifications-cache";

/** One notification by id, for one beyond the loaded pages: the caller enables it only then. */
export const useNotification = (id: string | null, { enabled }: { enabled: boolean }) => {
  const { i18n } = useTranslation();
  const locale = toBackendLocale(i18n.language as AppLocale);

  return useQuery({
    enabled: enabled && id !== null,
    queryKey: notificationQueryKey(id),
    queryFn: () =>
      apiGet<NotificationItem>(`/notifications/${id}?locale=${locale}`, { authenticated: true }),
    retry: false,
  });
};
