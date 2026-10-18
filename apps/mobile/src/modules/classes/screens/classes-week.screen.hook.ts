import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import { routes } from "@/constants/routes";
import { SessionExpiredError } from "@/services/api";
import { addDays, mondayOf } from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { useVisibleWeeksClasses } from "../hooks/use-visible-weeks-classes.hook";
import { useWeekClasses } from "../hooks/use-week-classes.hook";
import { todayInSchoolZone } from "../utils/calendar";
import { schoolDayOf } from "../utils/week";

import type { UseClassesWeekScreenProps } from "./classes-week.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useClassesWeekScreen = ({
  classRoute,
  canCreate,
}: UseClassesWeekScreenProps) => {
  const now = useNow();
  const today = todayInSchoolZone(now);
  const currentWeek = mondayOf(today);

  // One selected day: the calendar derives the week or the month it draws from it.
  const [selectedDate, setSelectedDate] = useState(today);
  // The days the calendar draws, reported by it: the dots come from the classes of all those weeks.
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    from: currentWeek,
    to: addDays(currentWeek, 6),
  });
  const weekStart = mondayOf(selectedDate);
  // Only the user's pull-to-refresh turns the spinner on: a week refetching in the background (the month view mounting
  // its cached weeks) must not, or the list would sink as in a pull-to-refresh.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useWeekClasses(weekStart);
  const visibleWeeks = useVisibleWeeksClasses(visibleRange);
  const queryClient = useQueryClient();

  // A class changed on a screen above this one (cancelled, edited) invalidated its week while this screen was not
  // looking: when it is focused again, the invalidated weeks are fetched, so the cards show the result at once.
  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries(
        {
          queryKey: ["classes", "week"],
          predicate: (query) => query.state.isInvalidated,
        },
        { cancelRefetch: false },
      );
    }, [queryClient]),
  );

  const items = query.data?.items ?? NO_ITEMS;
  const dayItems = items.filter(
    (item) => schoolDayOf(item.startsAt) === selectedDate,
  );
  const markedDates = [
    ...new Set(visibleWeeks.items.map((item) => schoolDayOf(item.startsAt))),
  ];

  const canCreateOnDay = canCreate === true && selectedDate >= today;

  // Every week the calendar draws, the selected day's one included.
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await visibleWeeks.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };
  const updateVisibleRange = (range: VisibleRange) =>
    setVisibleRange((current) =>
      current.from === range.from && current.to === range.to ? current : range,
    );
  // Only today or later can start a batch: a past day opens Nova aula with nothing picked.
  const createClass = () =>
    router.push(
      routes.admin.newClass(canCreateOnDay ? { date: selectedDate } : undefined),
    );
  const openClass = (id: string) => router.push(classRoute(id));

  return {
    now,
    today,
    selectedDate,
    markedDates,
    dayItems,
    canCreate: canCreate === true,
    canCreateOnDay,
    isLoading: query.isPending,
    // An expired session is handled by the session flow: nothing to show here.
    isError: query.isError && !(query.error instanceof SessionExpiredError),
    isRefreshing,
    refresh,
    retry: () => void query.refetch(),
    selectDate: setSelectedDate,
    updateVisibleRange,
    createClass,
    openClass,
  };
};
