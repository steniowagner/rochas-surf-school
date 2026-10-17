import { useTranslation } from "react-i18next";

import {
  buildFittedMonthGrid,
  dayAccessibilityLabel,
  getDateLocale,
  isSameMonth,
  monthOf,
  weekdayInitials,
} from "@/utils/calendar-dates";

import type {
  CalendarMonthGridDay,
  UseCalendarMonthGridProps,
} from "./calendar-month-grid.types";

export const useCalendarMonthGrid = ({
  month,
  selectedDate,
  today,
  markedDates,
  markedLabel,
}: UseCalendarMonthGridProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const marked = new Set(markedDates);

  const weeks: CalendarMonthGridDay[][] = buildFittedMonthGrid(month).map(
    (week) =>
      week.map((date) => ({
        date,
        number: Number(date.slice(8, 10)),
        selected: date === selectedDate,
        today: date === today,
        adjacent: !isSameMonth(monthOf(date), month),
        marked: marked.has(date),
        accessibilityLabel: dayAccessibilityLabel(
          date,
          locale,
          marked.has(date) ? markedLabel : undefined,
        ),
      })),
  );

  return { initials: weekdayInitials(locale), weeks };
};
