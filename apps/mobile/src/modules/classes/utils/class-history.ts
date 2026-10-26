import type { Locale } from "date-fns";

import { dayAndMonth, weekdayAbbreviation } from "@/utils/calendar-dates";

import type { ClassHistoryDay, ClassItem } from "../classes.types";
import { schoolDayOf } from "./week";

/** The America/Fortaleza days with one or more classes, each once, for the calendar's dots. */
export const daysWithClasses = (items: ClassItem[]): string[] => [
  ...new Set(items.map((item) => schoolDayOf(item.startsAt))),
];

/** The classes that start on the America/Fortaleza day, or all of them without a day. */
export const filterClassesByDay = (items: ClassItem[], day: string | null): ClassItem[] =>
  day === null ? items : items.filter((item) => schoolDayOf(item.startsAt) === day);

const newestFirst = (a: ClassItem, b: ClassItem): number =>
  b.startsAt.localeCompare(a.startsAt) || b.id.localeCompare(a.id);

/** The classes under one entry per America/Fortaleza day, newest day first, the classes of a day newest first. */
export const groupClassesByDay = (items: ClassItem[]): ClassHistoryDay[] => {
  const days = new Map<string, ClassItem[]>();

  for (const item of [...items].sort(newestFirst)) {
    const day = schoolDayOf(item.startsAt);
    const group = days.get(day);

    if (group) {
      group.push(item);
    } else {
      days.set(day, [item]);
    }
  }

  return [...days].map(([day, dayItems]) => ({ day, items: dayItems }));
};

/** The label above a day's classes: "SEX, 14 AGO". */
export const historyDayLabel = (day: string, locale: Locale): string =>
  `${weekdayAbbreviation(day, locale)}, ${dayAndMonth(day, locale)}`;

/** The chip of the selected day: "14 AGO". */
export const historyChipLabel = (day: string, locale: Locale): string => dayAndMonth(day, locale);
