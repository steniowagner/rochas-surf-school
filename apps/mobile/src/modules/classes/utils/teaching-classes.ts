import { getClassState } from "@rochas-surf-school/classes";
import type { Locale } from "date-fns";

import { addDays, formatIsoDate, weekdayName } from "@/utils/calendar-dates";

import {
  ClassItem,
  TeachingClassesLayout,
  TeachingDay,
  TeachingDayLabel,
} from "../classes.types";
import { todayInSchoolZone } from "./calendar";
import { schoolDayOf } from "./week";

const stateAt = (item: ClassItem, now: Date) =>
  getClassState(
    new Date(item.startsAt),
    new Date(item.endsAt),
    now,
    item.cancelledAt ? new Date(item.cancelledAt) : null,
  );

const labelOf = (day: string, today: string): TeachingDayLabel =>
  day === today ? "today" : day === addDays(today, 1) ? "tomorrow" : "weekday";

/**
 * "Minhas aulas" at `now`, from the items in start order (as the API answers them): the classes that have ended are
 * left out without waiting for a refetch; the ones under way (never a cancelled one) come first; the others are
 * grouped by their America/Fortaleza day; the next class is the first that hasn't started and isn't cancelled.
 */
export const layoutTeachingClasses = (
  items: ClassItem[],
  now: Date,
): TeachingClassesLayout => {
  const today = todayInSchoolZone(now);
  const ongoing: ClassItem[] = [];
  const days: TeachingDay[] = [];
  let nextId: string | null = null;

  for (const item of items) {
    if (new Date(item.endsAt).getTime() <= now.getTime()) continue;

    const state = stateAt(item, now);

    if (state === "started") {
      ongoing.push(item);
      continue;
    }
    if (state === "not-started" && nextId === null) nextId = item.id;

    const day = schoolDayOf(item.startsAt);
    const last = days.at(-1);

    if (last?.day === day) last.items.push(item);
    else days.push({ day, label: labelOf(day, today), items: [item] });
  }

  return { ongoing, days, nextId };
};

/** The classes the home row counts: every item that isn't cancelled (none of them has ended). */
export const countAssignedClasses = (items: ClassItem[]): number =>
  items.filter((item) => item.cancelledAt === null).length;

/** "17 set", "17 Sep": the day and the month's abbreviation, without the dot some locales add. */
export const formatShortDate = (day: string, locale: Locale): string =>
  formatIsoDate(day, "d MMM", locale).replace(/\.$/, "");

/** "Sexta", "Viernes", "Friday": the weekday's full name, without the "-feira" of the pt-BR weekdays. */
export const formatDayName = (day: string, locale: Locale): string =>
  weekdayName(day, locale).split("-")[0];
