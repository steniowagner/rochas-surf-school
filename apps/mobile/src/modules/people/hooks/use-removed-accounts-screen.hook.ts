import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { SessionExpiredError } from "@/services/api";

import { RemovedAccount } from "../people.types";
import {
  getRestoreErrorKey,
  isStaleRestoreError,
} from "../utils/removal-error";

import {
  RemovedAccountsStatus,
  UseRemovedAccountsScreenResult,
} from "./use-removed-accounts-screen.types";
import {
  REMOVED_ACCOUNTS_QUERY_KEY,
  useRemovedAccounts,
} from "./use-removed-accounts.hook";
import { useRestoreAccount } from "./use-restore-account.hook";

export const useRemovedAccountsScreen = (): UseRemovedAccountsScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const query = useRemovedAccounts();
  const restoreAccount = useRestoreAccount();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  // A second tap in the same frame must not send twice, before `restoringId` has re-rendered.
  const isRestoringNow = useRef(false);
  // Kept while the sheet slides away, so its content doesn't vanish before it is gone.
  const [selected, setSelected] = useState<RemovedAccount | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const accounts = query.data?.items ?? [];

  // Acts at once, with no confirmation and no success toast; one restore at a time, so the other buttons wait.
  const restore = async (account: RemovedAccount) => {
    if (isRestoringNow.current) {
      return;
    }

    isRestoringNow.current = true;
    setRestoringId(account.id);

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
    } finally {
      isRestoringNow.current = false;
      setRestoringId(null);
    }
  };

  const getStatus = (): RemovedAccountsStatus => {
    if (query.isPending) {
      return "loading";
    }

    // An expired session is handled once, centrally; until then the screen keeps its loading state.
    if (query.isError) {
      return query.error instanceof SessionExpiredError ? "loading" : "error";
    }

    return accounts.length === 0 ? "empty" : "ready";
  };

  return {
    accounts,
    status: getStatus(),
    isRefreshing,
    isRetrying: query.isFetching,
    selected,
    isSheetVisible,
    openAccount: (account) => {
      setSelected(account);
      setIsSheetVisible(true);
    },
    closeSheet: () => setIsSheetVisible(false),
    restoringId,
    restore,
    retry: () => {
      query.refetch();
    },
    refresh: async () => {
      setIsRefreshing(true);
      await query.refetch();
      setIsRefreshing(false);
    },
  };
};
