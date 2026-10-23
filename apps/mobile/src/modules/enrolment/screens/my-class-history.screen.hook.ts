import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CalendarPeriod } from "@/components/week-month-calendar/week-month-calendar.types";
import { routes } from "@/constants/routes";
import type { ClassItem } from "@/modules/classes/classes.types";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { todayInSchoolZone } from "@/modules/classes/utils/calendar";
import { SessionExpiredError } from "@/services/api";
import {
  addDays,
  getDateLocale,
  monthCaption,
  monthOf,
  monthPeriod,
  weekCaption,
} from "@/utils/calendar-dates";

import { useMyClassHistory } from "../hooks/use-my-class-history.hook";
import {
  daysWithClasses,
  filterClassesByDay,
  groupClassesByDay,
  historyChipLabel,
  historyDayLabel,
} from "../utils/class-history";

import type { HistoryRow, UseMyClassHistoryScreenResult } from "./my-class-history.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useMyClassHistoryScreen = (): UseMyClassHistoryScreenResult => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const now = useNow();
  const today = todayInSchoolZone(now);
  // Local state: the screen always opens on Fortaleza's current month, with no day selected.
  const [period, setPeriod] = useState<CalendarPeriod>(() => monthPeriod(monthOf(todayInSchoolZone())));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useMyClassHistory(period);

  const items = query.data?.items ?? NO_ITEMS;
  // The day filter runs on the period already loaded: picking or clearing a day sends no request.
  const rows: HistoryRow[] = groupClassesByDay(filterClassesByDay(items, selectedDay)).flatMap(
    ({ day, items: dayItems }) => [
      { type: "day" as const, key: `day-${day}`, label: historyDayLabel(day, locale) },
      ...dayItems.map((item) => ({ type: "class" as const, key: item.id, item })),
    ],
  );
  const isWeek = addDays(period.from, 6) === period.to;
  // A period with no data goes back to pending when it is fetched again after an error: while "Try again" runs, the
  // error stays on screen with the spinner in its button, instead of the loading state.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;
  const hasData = query.data !== undefined;

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
    today,
    selectedDay,
    markedDates: daysWithClasses(items),
    caption: isWeek ? weekCaption(period.from, locale) : monthCaption(monthOf(period.from), locale),
    dayLabel: selectedDay === null ? null : historyChipLabel(selectedDay, locale),
    rows,
    isLoading: query.isPending && !isRetrying,
    // A failed refresh keeps the classes loaded; an expired session is handled once, centrally.
    isError:
      isRetrying ||
      (query.isError && !hasData && !(query.error instanceof SessionExpiredError)),
    isEmpty: hasData && rows.length === 0,
    isRetrying,
    isRefreshing,
    selectDay: setSelectedDay,
    clearDay: () => setSelectedDay(null),
    updatePeriod: (next) =>
      setPeriod((current) =>
        current.from === next.from && current.to === next.to ? current : next,
      ),
    refresh,
    retry: () => void query.refetch(),
    openClass: (id) => router.push(routes.student.classDetail(id)),
  };
};
