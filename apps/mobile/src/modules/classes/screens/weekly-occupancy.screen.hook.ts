import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import {
  addWeeks,
  getDateLocale,
  mondayOf,
  weekCaption,
} from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { useNow } from "../hooks/use-now.hook";
import { weekClassesOptions } from "../hooks/use-week-classes.hook";
import { todayInSchoolZone } from "../utils/calendar";
import { getDefaultSelectedClassId } from "../utils/weekly-occupancy";

import type { UseWeeklyOccupancyScreenResult } from "./weekly-occupancy.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useWeeklyOccupancyScreen = (): UseWeeklyOccupancyScreenResult => {
  const { i18n } = useTranslation();
  const now = useNow();
  const today = todayInSchoolZone(now);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  // The class the admin tapped; `null` until they tap one, and again after they move to another week.
  const [tappedId, setTappedId] = useState<string | null>(null);
  const query = useQuery(weekClassesOptions(weekStart));

  const classes = query.data?.items ?? NO_ITEMS;
  // A refetch keeps the tapped class while it is still in the week, otherwise the default one is selected.
  const selectedId = classes.some((item) => item.id === tappedId)
    ? tappedId
    : getDefaultSelectedClassId(classes);

  const moveWeek = (amount: number) => {
    setWeekStart((current) => addWeeks(current, amount));
    setTappedId(null);
  };

  return {
    now,
    today,
    weekStart,
    caption: weekCaption(weekStart, getDateLocale(i18n.language)),
    classes,
    selectedId,
    selected: classes.find((item) => item.id === selectedId) ?? null,
    goPrevious: () => moveWeek(-1),
    goNext: () => moveWeek(1),
    selectClass: setTappedId,
    openClass: (id) => router.push(routes.admin.classDetail(id)),
  };
};
