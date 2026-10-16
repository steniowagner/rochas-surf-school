import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import { SessionExpiredError } from "@/services/api";
import {
  addDays,
  addWeeks,
  formatIsoDate,
  getDateLocale,
  isoWeekdayOf,
  mondayOf,
  weekCaption,
  weekdayName,
  weekDays,
} from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { useWeekClasses } from "../hooks/use-week-classes.hook";
import { todayInSchoolZone } from "../utils/calendar";
import { relativeWeek, schoolDayOf, weeksBetween } from "../utils/week";

import type { UseClassesWeekScreenProps } from "./classes-week.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useClassesWeekScreen = ({
  classRoute,
  canCreate,
}: UseClassesWeekScreenProps) => {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const locale = getDateLocale(i18n.language);
  const today = todayInSchoolZone(now);
  const currentWeek = mondayOf(today);

  const [weekStart, setWeekStart] = useState(currentWeek);
  // The weekday stays selected when moving between weeks.
  const [weekday, setWeekday] = useState(() => isoWeekdayOf(today));
  const query = useWeekClasses(weekStart);

  const days = weekDays(weekStart);
  const selectedDay = addDays(weekStart, weekday - 1);
  const items = query.data?.items ?? NO_ITEMS;
  const counts: Record<string, number> = {};
  for (const item of items) {
    const day = schoolDayOf(item.startsAt);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const dayItems = items.filter(
    (item) => schoolDayOf(item.startsAt) === selectedDay,
  );

  const relative = relativeWeek(weeksBetween(currentWeek, weekStart));
  const canCreateOnDay = canCreate === true && selectedDay >= today;

  const goToWeek = (offset: number) =>
    setWeekStart((current) => addWeeks(current, offset));
  const goToToday = () => {
    setWeekStart(currentWeek);
    setWeekday(isoWeekdayOf(today));
  };
  const selectDay = (day: string) => setWeekday(isoWeekdayOf(day));
  // Only today or later can start a batch: a past day opens Nova aula with nothing picked.
  const createClass = () =>
    router.push(
      routes.admin.newClass(canCreateOnDay ? { date: selectedDay } : undefined),
    );
  const openClass = (id: string) => router.push(classRoute(id));

  return {
    now,
    today,
    days,
    selectedDay,
    counts,
    dayItems,
    weekLabel: t(`classesWeek.relative.${relative.key}`, {
      count: relative.count,
    }),
    caption: weekCaption(weekStart, locale),
    dayTitle: `${weekdayName(selectedDay, locale)} · ${formatIsoDate(selectedDay, "d MMM", locale)}`,
    showToday: weekStart !== currentWeek,
    canCreate: canCreate === true,
    canCreateOnDay,
    isLoading: query.isPending,
    // An expired session is handled by the session flow: nothing to show here.
    isError: query.isError && !(query.error instanceof SessionExpiredError),
    isRefreshing: query.isRefetching,
    refresh: () => void query.refetch(),
    retry: () => void query.refetch(),
    goToPreviousWeek: () => goToWeek(-1),
    goToNextWeek: () => goToWeek(1),
    goToToday,
    selectDay,
    createClass,
    openClass,
  };
};
