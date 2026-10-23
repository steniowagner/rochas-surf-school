import type { Locale } from "date-fns";

import type { ClassItem } from "@/modules/classes/classes.types";
import { schoolDayOf } from "@/modules/classes/utils/week";
import { dayAndMonth, weekdayAbbreviation } from "@/utils/calendar-dates";

import type { ClassHistoryDay } from "../enrolment.types";

/** How many classes start on each America/Fortaleza day, for the calendar's dots. */
export const countClassesByDay = (items: ClassItem[]): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const day = schoolDayOf(item.startsAt);
    counts[day] = (counts[day] ?? 0) + 1;
  }

  return counts;
};

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
