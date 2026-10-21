import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { getRegistrationErrorKey } from "@/modules/admin/utils/registration-error";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { SessionExpiredError } from "@/services/api";

import { useMyClassHistory } from "../hooks/use-my-class-history.hook";

import type { UseMyClassHistoryScreenResult } from "./my-class-history.screen.types";

export const useMyClassHistoryScreen = (): UseMyClassHistoryScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const now = useNow();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useMyClassHistory();

  const loadMore = async () => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    const result = await query.fetchNextPage();

    // A failed next page keeps the classes already shown and only toasts.
    if (result.isFetchNextPageError) {
      const key = getRegistrationErrorKey(result.error);

      if (key) {
        alertMessage.show(t(key));
      }
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    now,
    classes: query.classes,
    isLoading: query.isPending,
    // An expired session is handled once, centrally.
    isError:
      query.isError &&
      query.classes.length === 0 &&
      !(query.error instanceof SessionExpiredError),
    isEmpty: query.isSuccess && query.classes.length === 0,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefreshing,
    refresh,
    retry: () => void query.refetch(),
    loadMore,
    openClass: (id) => router.push(routes.student.classDetail(id)),
  };
};
