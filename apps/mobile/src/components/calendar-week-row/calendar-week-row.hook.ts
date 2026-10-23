import { useTranslation } from "react-i18next";

import {
  dayAccessibilityLabel,
  getDateLocale,
  markedDayDots,
  weekdayAbbreviation,
} from "@/utils/calendar-dates";

import type {
  CalendarWeekRowDay,
  UseCalendarWeekRowProps,
} from "./calendar-week-row.types";

export const useCalendarWeekRow = ({
  days,
  selectedDate,
  today,
  markedDates,
  markedCounts,
  markedLabel,
}: UseCalendarWeekRowProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const marked = new Set(markedDates);

  const weekDays: CalendarWeekRowDay[] = days.map((date) => ({
    date,
    weekday: weekdayAbbreviation(date, locale),
    number: Number(date.slice(8, 10)),
    selected: date === selectedDate,
    today: date === today,
    marked: marked.has(date),
    dots: markedDayDots(date, marked, markedCounts),
    accessibilityLabel: dayAccessibilityLabel(
      date,
      locale,
      marked.has(date) ? markedLabel : undefined,
    ),
  }));

  return { weekDays };
};
