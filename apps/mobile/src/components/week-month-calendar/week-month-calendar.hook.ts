import { useEffect, useEffectEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addDays,
  addMonthsKeepingDay,
  getDateLocale,
  mondayOf,
  monthCaption,
  monthOf,
  monthRange,
  weekCaption,
  weekDays,
} from "@/utils/calendar-dates";

import type {
  CalendarView,
  UseWeekMonthCalendarProps,
  VisibleRange,
} from "./week-month-calendar.types";

export const useWeekMonthCalendar = ({
  selectedDate,
  onSelectDate,
  onVisibleRangeChange,
}: UseWeekMonthCalendarProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const [view, setView] = useState<CalendarView>("week");
  const isMonth = view === "month";

  const weekStart = mondayOf(selectedDate);
  const days = weekDays(weekStart);
  const month = monthOf(selectedDate);
  const range: VisibleRange = isMonth
    ? monthRange(month)
    : { from: weekStart, to: addDays(weekStart, 6) };

  const reportRange = useEffectEvent((visible: VisibleRange) => {
    onVisibleRangeChange?.(visible);
  });

  useEffect(() => {
    reportRange({ from: range.from, to: range.to });
  }, [range.from, range.to]);

  return {
    view,
    days,
    month,
    caption: isMonth ? monthCaption(month, locale) : weekCaption(weekStart, locale),
    toggleView: () => setView(isMonth ? "week" : "month"),
    goPrevious: () =>
      onSelectDate(isMonth ? addMonthsKeepingDay(selectedDate, -1) : addDays(selectedDate, -7)),
    goNext: () =>
      onSelectDate(isMonth ? addMonthsKeepingDay(selectedDate, 1) : addDays(selectedDate, 7)),
  };
};
