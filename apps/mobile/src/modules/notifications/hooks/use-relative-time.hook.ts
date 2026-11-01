import { useTranslation } from "react-i18next";

import type { AppLocale } from "@/i18n/locales";
import { formatCreatedAt } from "@/utils/format-created-at";

/** How long ago a notification arrived, as its row and the message sheet show it; empty for a date it can't read. */
export const useRelativeTime = (createdAt: string, now: Date) => {
  const { t, i18n } = useTranslation();
  const label = formatCreatedAt(createdAt, now, i18n.language as AppLocale);

  return label?.type === "now" ? t("notifications.now") : (label?.text ?? "");
};
