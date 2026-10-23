import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";
import type { AppLocale } from "@/i18n/locales";
import { formatCreatedAt } from "@/utils/format-created-at";

import { notificationIcon, NotificationTone } from "../../utils/notification-icon";

import { UseNotificationRowProps } from "./notification-row.types";

const TILE_CLASS: Record<NotificationTone, string> = {
  info: "bg-info-tint",
  ok: "bg-ok-tint",
  bad: "bg-bad-tint",
  warn: "bg-warn-tint",
};

export const useNotificationRow = ({ notification, now }: UseNotificationRowProps) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const icon = notificationIcon(notification.type);
  const glyphColor = { info: theme.lagoon, ok: theme.ok, bad: theme.bad, warn: theme.warn }[icon.tone];

  const label = formatCreatedAt(notification.createdAt, now, i18n.language as AppLocale);
  const time = label?.type === "now" ? t("notifications.now") : (label?.text ?? "");

  const accessibilityLabel =
    [notification.title, notification.body, time].filter(Boolean).join(", ") +
    (notification.read ? "" : t("notifications.unread"));

  return {
    iconName: icon.name,
    glyphColor,
    tileClassName: TILE_CLASS[icon.tone],
    time,
    accessibilityLabel,
  };
};
