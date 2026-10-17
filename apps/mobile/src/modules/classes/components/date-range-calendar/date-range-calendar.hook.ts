import { addDays, format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addMonths,
  buildMonthGrid,
  formatIsoDate,
  getDateLocale,
  isSameMonth,
  isoWeekdayOf,
  monthOf,
} from "@/utils/calendar-dates";
import type { CalendarMonth } from "@/utils/calendar-dates.types";

import { EMPTY_RANGE, pressDay } from "../../utils/calendar";

import { UseDateRangeCalendarProps } from "./date-range-calendar.types";

// A Monday; any week would do.
const REFERENCE_MONDAY = new Date(2026, 9, 12);

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const useDateRangeCalendar = ({
  today,
  startDate,
  endDate,
  excludedDates,
  onRangeChange,
}: UseDateRangeCalendarProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    monthOf(startDate ?? today),
  );

  const isRange = startDate !== null && endDate !== null;
  // The current month hides the days before it, which are past; any later month shows both neighbors in full.
  const weeks = buildMonthGrid(visibleMonth, !isSameMonth(visibleMonth, monthOf(today)));
  const monthLabel = capitalize(
    format(new Date(visibleMonth.year, visibleMonth.month - 1, 1), "LLLL yyyy", {
      locale,
    }),
  );
  const weekdayInitials = Array.from({ length: 7 }, (_, index) =>
    format(addDays(REFERENCE_MONDAY, index), "EEEEE", { locale }).toUpperCase(),
  );
  const canGoPrevious = !isSameMonth(visibleMonth, monthOf(today));

  // The band runs from the first to the last day, edges included, once they are two different days.
  const hasBand = isRange && startDate !== endDate;

  const dayState = (date: string) => {
    const inRange = hasBand && date >= startDate && date <= endDate;
    const weekday = isoWeekdayOf(date);

    return {
      disabled: date < today,
      adjacentMonth: !isSameMonth(monthOf(date), visibleMonth),
      today: date === today,
      edge: date === startDate || date === endDate,
      inRange,
      // Each week's stretch of the band is a pill of its own: it also ends at the edges of the grid.
      bandStart: inRange && (date === startDate || weekday === 1),
      bandEnd: inRange && (date === endDate || weekday === 7),
      excluded: inRange && excludedDates.includes(date),
      accessibilityLabel: formatIsoDate(date, "PPPP", locale),
    };
  };

  // The button is disabled on the current month, so there is no way to go before it.
  const goPrevious = () => setVisibleMonth((current) => addMonths(current, -1));

  const goNext = () => setVisibleMonth((current) => addMonths(current, 1));

  const selectDay = (date: string) => {
    onRangeChange(pressDay({ startDate, endDate, excludedDates }, date));
  };

  const clear = () => onRangeChange(EMPTY_RANGE);

  return {
    weeks,
    monthLabel,
    weekdayInitials,
    canGoPrevious,
    dayState,
    goPrevious,
    goNext,
    selectDay,
    clear,
  };
};
