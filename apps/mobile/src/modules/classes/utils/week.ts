import { tz } from "@date-fns/tz";
import { format, type Locale } from "date-fns";

import { formatIsoDate, toUtcMs, weekdayName } from "@/utils/calendar-dates";

import { SCHOOL_TIME_ZONE, todayInSchoolZone } from "./calendar";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many weeks `weekStart` is after `currentWeekStart` (negative for the past). */
export const weeksBetween = (currentWeekStart: string, weekStart: string): number =>
  Math.round((toUtcMs(weekStart) - toUtcMs(currentWeekStart)) / (7 * DAY_MS));

export type RelativeWeek = {
  /** A key under `classesWeek.relative`. */
  key: "current" | "previous" | "next" | "past" | "future";
  count: number;
};

export const relativeWeek = (offset: number): RelativeWeek => {
  if (offset === 0) return { key: "current", count: 0 };
  if (offset === -1) return { key: "previous", count: 1 };
  if (offset === 1) return { key: "next", count: 1 };

  return offset < 0
    ? { key: "past", count: -offset }
    : { key: "future", count: offset };
};

/** The `YYYY-MM-DD` day (America/Fortaleza) an instant falls on. */
export const schoolDayOf = (instant: string): string =>
  todayInSchoolZone(new Date(instant));

/** "08:00", America/Fortaleza. */
export const schoolTimeOf = (instant: string): string =>
  format(new Date(instant), "HH:mm", { in: tz(SCHOOL_TIME_ZONE) });

export type DateLineLabels = {
  today: string;
  tomorrow: string;
  yesterday: string;
};

/**
 * The date of a class for the details: "Today", "Tomorrow" or "Yesterday" when it applies, else the weekday name, then
 * " · 14 Oct", plus the year when it isn't the current one.
 */
export const formatDateLine = (
  classDay: string,
  today: string,
  locale: Locale,
  labels: DateLineLabels,
): string => {
  const distance = Math.round((toUtcMs(classDay) - toUtcMs(today)) / DAY_MS);
  const name =
    distance === 0
      ? labels.today
      : distance === 1
        ? labels.tomorrow
        : distance === -1
          ? labels.yesterday
          : weekdayName(classDay, locale);
  const withYear = classDay.slice(0, 4) !== today.slice(0, 4);
  const date = formatIsoDate(classDay, withYear ? "d MMM yyyy" : "d MMM", locale);

  return `${name} · ${date}`;
};
