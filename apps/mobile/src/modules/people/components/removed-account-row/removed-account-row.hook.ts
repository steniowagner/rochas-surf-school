import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { AppLocale } from "@/i18n/locales";
import { useAlertMessage } from "@/providers/alert-message";

import { REMOVED_ACCOUNTS_QUERY_KEY } from "../../hooks/use-removed-accounts.hook";
import { useRestoreAccount } from "../../hooks/use-restore-account.hook";
import { RemovedAccount } from "../../people.types";
import { formatRemovalDates } from "../../utils/format-removal-dates";
import { getRestoreErrorKey, isStaleRestoreError } from "../../utils/removal-error";
import { roleChip } from "../../utils/role-chip";

export const useRemovedAccountRow = (account: RemovedAccount) => {
  const { t, i18n } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const restoreAccount = useRestoreAccount();
  const { date, until } = formatRemovalDates(account.removedAt, i18n.language as AppLocale);

  // Acts at once, with no confirmation and no success toast; the button ignores presses while it is loading.
  const restore = async () => {
    try {
      await restoreAccount.mutateAsync(account.id);
    } catch (error) {
      const key = getRestoreErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      // Someone else restored it, or its time ran out: show the truth.
      if (isStaleRestoreError(error)) {
        queryClient.invalidateQueries({ queryKey: REMOVED_ACCOUNTS_QUERY_KEY });
      }
    }
  };

  return {
    description: t("people.removed.row", {
      role: t(roleChip[account.role].labelKey),
      date,
      until,
    }),
    restore,
    isRestoring: restoreAccount.isPending,
  };
};
