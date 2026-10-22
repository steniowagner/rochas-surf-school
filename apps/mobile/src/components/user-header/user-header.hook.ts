import { useTranslation } from "react-i18next";

import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useSession } from "@/providers/session";
import { getGreetingPeriod } from "@/utils/greeting-period";

import { UNREAD_NOTIFICATIONS_COUNT } from "./user-header.constants";

export const useUserHeader = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  // Refreshed every minute, so the greeting changes while the tab stays open.
  const now = useNow();
  const name = user?.name.trim() ?? "";

  return {
    name,
    firstName: name.split(/\s+/)[0],
    greetingPeriod: getGreetingPeriod(now),
    unreadCount: UNREAD_NOTIFICATIONS_COUNT,
    notificationsLabel:
      UNREAD_NOTIFICATIONS_COUNT > 0
        ? t("userHeader.notificationsUnread", {
            count: UNREAD_NOTIFICATIONS_COUNT,
          })
        : t("userHeader.notifications"),
  };
};
