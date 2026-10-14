import { addDays, format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CalendarMonth } from "../../classes.types";
import {
  addMonths,
  buildMonthGrid,
  getDateLocale,
  isSameMonth,
  isoWeekdayOf,
  monthOf,
  pressDay,
  toLocalDate,
} from "../../utils/calendar";

import { UseDateRangeCalendarProps } from "./date-range-calendar.types";

// A Monday; any week would do.
const REFERENCE_MONDAY = new Date(2026, 9, 12);

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const useDateRangeCalendar = ({
  today,
  startDate,
  endDate,
  weekdays,
  onRangeChange,
}: UseDateRangeCalendarProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    monthOf(startDate ?? today),
  );

  const isRange = startDate !== null && endDate !== null;
  const weeks = buildMonthGrid(visibleMonth);
  const monthLabel = capitalize(
    format(new Date(visibleMonth.year, visibleMonth.month - 1, 1), "LLLL yyyy", {
      locale,
    }),
  );
  const weekdayInitials = Array.from({ length: 7 }, (_, index) =>
    format(addDays(REFERENCE_MONDAY, index), "EEEEE", { locale }).toUpperCase(),
  );
  const canGoPrevious = !isSameMonth(visibleMonth, monthOf(today));

  const formatDay = (date: string, pattern: string): string =>
    format(toLocalDate(date), pattern, { locale });

  const dayState = (date: string) => ({
    disabled: date < today,
    today: date === today,
    edge: date === startDate || date === endDate,
    inRange: isRange && date > startDate && date < endDate,
    excluded:
      isRange &&
      date >= startDate &&
      date <= endDate &&
      !weekdays.includes(isoWeekdayOf(date)),
    accessibilityLabel: formatDay(date, "PPPP"),
  });

  // The first line under the grid: what to do next, or the range chosen.
  const hint =
    startDate === null
      ? { kind: "start" as const }
      : endDate === null
        ? { kind: "pickEnd" as const, date: formatDay(startDate, "d MMM") }
        : {
            kind: "range" as const,
            text: `${formatDay(startDate, "d MMM")} – ${formatDay(endDate, "d MMM")}`,
          };

  // The button is disabled on the current month, so there is no way to go before it.
  const goPrevious = () => setVisibleMonth((current) => addMonths(current, -1));

  const goNext = () => setVisibleMonth((current) => addMonths(current, 1));

  const selectDay = (date: string) => {
    onRangeChange(pressDay({ startDate, endDate }, date));
  };

  const clear = () => onRangeChange({ startDate: null, endDate: null });

  return {
    weeks,
    monthLabel,
    weekdayInitials,
    canGoPrevious,
    dayState,
    hint,
    isRange,
    goPrevious,
    goNext,
    selectDay,
    clear,
  };
};
