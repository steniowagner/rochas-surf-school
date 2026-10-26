import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addMonths,
  buildFittedMonthGrid,
  getDateLocale,
  monthCaption,
  monthOf,
} from "@/utils/calendar-dates";
import type { CalendarMonth } from "@/utils/calendar-dates.types";

import { useVisibleWeeksClasses } from "../../hooks/use-visible-weeks-classes.hook";
import { schoolDayOf } from "../../utils/week";

import type { UseWeekPickerSheetProps } from "./week-picker-sheet.types";

export const useWeekPickerSheet = ({
  visible,
  weekStart,
  onClose,
  onSelectDate,
}: UseWeekPickerSheetProps) => {
  const { i18n } = useTranslation();
  const [month, setMonth] = useState<CalendarMonth>(() => monthOf(weekStart));
  const [wasVisible, setWasVisible] = useState(visible);

  // Each time the sheet opens it shows the month of the selected week, wherever it was left.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) {
      setMonth(monthOf(weekStart));
    }
  }

  // The classes of the weeks the grid draws, to dot the days that have one. Closed, it reads only the selected week,
  // which the screen has loaded already, so the sheet requests nothing until it opens.
  const grid = buildFittedMonthGrid(month);
  const range = visible
    ? { from: grid[0][0], to: grid[grid.length - 1][6] }
    : { from: weekStart, to: weekStart };
  const { items } = useVisibleWeeksClasses(range);
  const markedDates = [
    ...new Set(items.map((item) => schoolDayOf(item.startsAt))),
  ];

  const selectDate = (date: string) => {
    onSelectDate(date);
    onClose();
  };

  return {
    month,
    markedDates,
    caption: monthCaption(month, getDateLocale(i18n.language)),
    goPrevious: () => setMonth((current) => addMonths(current, -1)),
    goNext: () => setMonth((current) => addMonths(current, 1)),
    selectDate,
  };
};
