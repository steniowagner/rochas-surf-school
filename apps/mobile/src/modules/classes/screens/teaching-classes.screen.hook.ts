import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { SessionExpiredError } from "@/services/api";
import { getDateLocale } from "@/utils/calendar-dates";

import type { ClassItem, DisciplineFilterValue } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { useTeachingClasses } from "../hooks/use-teaching-classes.hook";
import {
  formatDayName,
  formatShortDate,
  layoutTeachingClasses,
} from "../utils/teaching-classes";

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
  // The sport shown, over the classes already loaded: switching it needs no request, and it lasts while the screen is
  // mounted.
  const [discipline, setDiscipline] = useState<DisciplineFilterValue>("all");
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
  const allItems = query.data?.items ?? NO_ITEMS;
  // Filtered before the layout, so the classes under way, the days and the next class are all of the chosen sport.
  const items = allItems.filter(
    (item) => discipline === "all" || item.discipline === discipline,
  );
  const layout = layoutTeachingClasses(items, now);
  const rows: TeachingClassesRow[] = [
    ...layout.ongoing.map((item): TeachingClassesRow => ({
      type: "ongoing",
      key: `ongoing-${item.id}`,
      item,
    })),
    ...layout.days.flatMap((day): TeachingClassesRow[] => [
      {
        type: "day",
        key: `day-${day.day}`,
        label:
          day.label === "weekday"
            ? formatDayName(day.day, locale)
            : t(`teachingClasses.${day.label}`),
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

  const isEmpty = query.data !== undefined && rows.length === 0;
  // Empty only because of the filter, while classes of the other sport are still to come: "no classes assigned yet"
  // would be false.
  const emptyDiscipline =
    isEmpty &&
    discipline !== "all" &&
    allItems.some((item) => new Date(item.endsAt).getTime() > now.getTime())
      ? discipline
      : null;

  return {
    now,
    rows,
    discipline,
    isEmpty,
    emptyDiscipline,
    isLoading: query.isPending && !isRetrying,
    // An expired session is handled by the session flow; a failed refetch keeps the list it had.
    isError:
      isRetrying ||
      (query.isError &&
        query.data === undefined &&
        !(query.error instanceof SessionExpiredError)),
    isRetrying,
    isRefreshing,
    refresh,
    retry: () => void refetch(),
    selectDiscipline: setDiscipline,
    openClass: (id) => router.push(routes[role].classDetail(id)),
  };
};
