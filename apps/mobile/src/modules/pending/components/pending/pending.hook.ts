import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppLocale } from "@/i18n/locales";
import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useSession } from "@/providers/session";

import { formatCreatedAt } from "../../utils/format-created-at";

import { UsePendingResult } from "./pending.types";

const REFRESH_INTERVAL_MS = 60 * 1000;

export const usePending = (): UsePendingResult => {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { signOut } = useSignOut();
  const [now, setNow] = useState(() => new Date());

  // Recomputed every minute, so "Now" doesn't go stale while the screen stays open.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // The session is already empty for a moment while a sign-out navigates away.
  const label = user
    ? formatCreatedAt(user.createdAt, now, i18n.language as AppLocale)
    : null;

  return {
    email: user?.email ?? "",
    createdAtLabel:
      label?.type === "now" ? t("pending.now") : (label?.text ?? null),
    signOut,
  };
};
