import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { SessionExpiredError } from "@/services/api";
import { getDateLocale, weekdayName } from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { useTeachingClasses } from "../hooks/use-teaching-classes.hook";
import { formatShortDate, layoutTeachingClasses } from "../utils/teaching-classes";

import type {
  TeachingClassesRow,
  UseTeachingClassesScreenProps,
  UseTeachingClassesScreenResult,
} from "./teaching-classes.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useTeachingClassesScreen = ({
  role,
}: UseTeachingClassesScreenProps): UseTeachingClassesScreenResult => {
  const { t, i18n } = useTranslation();
  const now = useNow();
  // Only the user's pull-to-refresh turns the spinner on, not the refetch of a focus.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useTeachingClasses();
  const { refetch } = query;

  // Back on the screen, the classes may have changed elsewhere (a class's details, a push): read them again, without
  // restarting a load already running.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const locale = getDateLocale(i18n.language);
  const layout = layoutTeachingClasses(query.data?.items ?? NO_ITEMS, now);
  const rows: TeachingClassesRow[] = [
    ...layout.ongoing.map((item): TeachingClassesRow => ({ type: "ongoing", key: `ongoing-${item.id}`, item })),
    ...layout.days.flatMap((day): TeachingClassesRow[] => [
      {
        type: "day",
        key: `day-${day.day}`,
        label: day.label === "weekday" ? weekdayName(day.day, locale) : t(`teachingClasses.${day.label}`),
        date: formatShortDate(day.day, locale),
      },
      ...day.items.map((item): TeachingClassesRow => ({
        type: "class",
        key: `class-${item.id}`,
        item,
        isNext: item.id === layout.nextId,
      })),
    ]),
  ];

  // With no classes loaded, a fetch after an error goes back to pending: while "Try again" runs, the error stays on
  // screen with the spinner in its button, instead of the loading state.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;

  return {
    now,
    rows,
    isEmpty: query.data !== undefined && rows.length === 0,
    isLoading: query.isPending && !isRetrying,
    // An expired session is handled by the session flow; a failed refetch keeps the list it had.
    isError:
      isRetrying ||
      (query.isError && query.data === undefined && !(query.error instanceof SessionExpiredError)),
    isRetrying,
    isRefreshing,
    refresh,
    retry: () => void refetch(),
    openClass: (id) => router.push(routes[role].classDetail(id)),
  };
};
