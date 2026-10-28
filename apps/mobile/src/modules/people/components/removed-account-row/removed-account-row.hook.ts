import { useTranslation } from "react-i18next";

import type { AppLocale } from "@/i18n/locales";

import { RemovedAccount } from "../../people.types";
import { formatRemovalDates } from "../../utils/format-removal-dates";

export const useRemovedAccountRow = (account: RemovedAccount) => {
  const { t, i18n } = useTranslation();
  const { date, until } = formatRemovalDates(
    account.removedAt,
    i18n.language as AppLocale,
  );

  return {
    removedOn: t("people.removed.removedOn", { date }),
    deletedOn: t("people.removed.deletedOn", { until }),
  };
};
