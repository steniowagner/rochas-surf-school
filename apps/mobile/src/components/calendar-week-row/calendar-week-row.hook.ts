import { useTranslation } from "react-i18next";

import {
  dayAccessibilityLabel,
  getDateLocale,
  weekdayAbbreviation,
} from "@/utils/calendar-dates";

import type {
  CalendarWeekRowDay,
  CalendarWeekRowProps,
} from "./calendar-week-row.types";

export const useCalendarWeekRow = ({
  days,
  selectedDate,
  today,
  markedDates,
  markedLabel,
}: Pick<
  CalendarWeekRowProps,
  "days" | "selectedDate" | "today" | "markedDates" | "markedLabel"
>) => {
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
    accessibilityLabel: dayAccessibilityLabel(
      date,
      locale,
      marked.has(date) ? markedLabel : undefined,
    ),
  }));

  return { weekDays };
};
