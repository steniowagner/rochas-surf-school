import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { SessionExpiredError } from "@/services/api";
import { getDateLocale, mondayOf, weekCaption } from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { weekClassesOptions } from "../hooks/use-week-classes.hook";
import { todayInSchoolZone } from "../utils/calendar";
import {
  getDefaultSelectedClassId,
  getOccupancyStats,
  getRelativeWeek,
} from "../utils/weekly-occupancy";

import type {
  UseWeeklyOccupancyScreenProps,
  UseWeeklyOccupancyScreenResult,
} from "./weekly-occupancy.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useWeeklyOccupancyScreen = ({
  role,
}: UseWeeklyOccupancyScreenProps): UseWeeklyOccupancyScreenResult => {
  const { i18n, t } = useTranslation();
  const now = useNow();
  const today = todayInSchoolZone(now);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  // The class the admin tapped; `null` until they tap one, and again after they move to another week.
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tappedId, setTappedId] = useState<string | null>(null);
  // Only the user's pull-to-refresh turns the spinner on, not the refetch of a focus.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useQuery(weekClassesOptions(weekStart));
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

  const classes = query.data?.items ?? NO_ITEMS;
  // A refetch keeps the tapped class while it is still in the week, otherwise the default one is selected.
  const selectedId = classes.some((item) => item.id === tappedId)
    ? tappedId
    : getDefaultSelectedClassId(classes);

  const selectWeekOf = (date: string) => {
    setWeekStart(mondayOf(date));
    setTappedId(null);
  };

  // With no classes loaded, a fetch after an error goes back to pending: while "Try again" runs, the error stays on
  // screen with the spinner in its button, instead of the loading state.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;

  const relativeWeek = getRelativeWeek(mondayOf(today), weekStart);

  return {
    now,
    today,
    weekStart,
    relativeLabel: t(`weeklyOccupancy.relativeWeek.${relativeWeek.key}`, {
      count: relativeWeek.count,
    }),
    isCurrentWeek: relativeWeek.isCurrent,
    caption: weekCaption(weekStart, getDateLocale(i18n.language)),
    classes,
    stats: getOccupancyStats(classes),
    selectedId,
    selected: classes.find((item) => item.id === selectedId) ?? null,
    isLoading: query.isPending && !isRetrying,
    // An expired session is handled by the session flow; a failed refetch keeps the map it had.
    isError:
      isRetrying ||
      (query.isError &&
        query.data === undefined &&
        !(query.error instanceof SessionExpiredError)),
    isRetrying,
    isEmpty: query.data !== undefined && classes.length === 0,
    isRefreshing,
    refresh,
    retry: () => void refetch(),
    isCalendarOpen,
    openCalendar: () => setIsCalendarOpen(true),
    closeCalendar: () => setIsCalendarOpen(false),
    selectWeekOf,
    selectClass: setTappedId,
    openClass: (id) => router.push(routes[role].classDetail(id)),
  };
};
