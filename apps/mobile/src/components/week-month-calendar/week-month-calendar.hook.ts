import { useEffect, useEffectEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addDays,
  addMonths,
  addMonthsKeepingDay,
  getDateLocale,
  isSameMonth,
  mondayOf,
  monthCaption,
  monthOf,
  monthPeriod,
  monthRange,
  toIsoDate,
  weekCaption,
  weekDays,
} from "@/utils/calendar-dates";

import type {
  CalendarPeriod,
  CalendarView,
  UseWeekMonthCalendarProps,
  VisibleRange,
} from "./week-month-calendar.types";

export const useWeekMonthCalendar = ({
  selectedDate,
  today,
  onSelectDate,
  onVisibleRangeChange,
  initialView = "week",
  clearable = false,
  onClearSelection,
  onPeriodChange,
}: UseWeekMonthCalendarProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const [view, setView] = useState<CalendarView>(initialView);
  // With `clearable`, the day the week or month on screen is drawn around; without it, the selected day is.
  const [shownDate, setShownDate] = useState(selectedDate ?? today);
  const anchor = clearable ? shownDate : (selectedDate ?? today);
  const isMonth = view === "month";

  const weekStart = mondayOf(anchor);
  const days = weekDays(weekStart);
  const month = monthOf(anchor);
  const weekEnd = addDays(weekStart, 6);
  const range: VisibleRange = isMonth ? monthRange(month) : { from: weekStart, to: weekEnd };
  const period: CalendarPeriod = isMonth ? monthPeriod(month) : { from: weekStart, to: weekEnd };

  const reportRange = useEffectEvent((visible: VisibleRange) => {
    onVisibleRangeChange?.(visible);
  });

  useEffect(() => {
    reportRange({ from: range.from, to: range.to });
  }, [range.from, range.to]);

  const reportPeriod = useEffectEvent((shown: CalendarPeriod) => {
    onPeriodChange?.(shown);
  });

  useEffect(() => {
    reportPeriod({ from: period.from, to: period.to });
  }, [period.from, period.to]);

  const clearSelection = () => {
    if (selectedDate !== null) onClearSelection?.();
  };

  const move = (amount: number) => {
    if (!clearable) {
      onSelectDate(
        isMonth ? addMonthsKeepingDay(anchor, amount) : addDays(anchor, amount * 7),
      );
      return;
    }

    clearSelection();
    setShownDate(isMonth ? toIsoDate(addMonths(month, amount), 1) : addDays(weekStart, amount * 7));
  };

  const toggleView = () => {
    setView(isMonth ? "week" : "month");

    if (!clearable || selectedDate !== null) return;

    if (isMonth) {
      setShownDate(isSameMonth(monthOf(today), month) ? today : toIsoDate(month, 1));
    } else {
      setShownDate(weekStart);
    }
  };

  const selectDate = (date: string) => {
    if (!clearable) {
      onSelectDate(date);
      return;
    }

    if (date === selectedDate) {
      onClearSelection?.();
      return;
    }

    setShownDate(date);
    onSelectDate(date);
  };

  return {
    view,
    days,
    month,
    caption: isMonth ? monthCaption(month, locale) : weekCaption(weekStart, locale),
    toggleView,
    goPrevious: () => move(-1),
    goNext: () => move(1),
    selectDate,
  };
};
