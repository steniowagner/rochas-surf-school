import { tz } from "@date-fns/tz";
import { format, type Locale } from "date-fns";

import {
  formatIsoDate,
  isoWeekdayOf,
  SCHOOL_TIME_ZONE,
  todayInSchoolZone,
} from "./calendar";

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMs = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];

  return Date.UTC(year, month - 1, day);
};

/** A `YYYY-MM-DD` date moved by whole days. */
export const addDays = (isoDate: string, amount: number): string =>
  new Date(toUtcMs(isoDate) + amount * DAY_MS).toISOString().slice(0, 10);

/** The Monday of the week that holds the date. */
export const mondayOf = (isoDate: string): string =>
  addDays(isoDate, 1 - isoWeekdayOf(isoDate));

export const addWeeks = (weekStart: string, amount: number): string =>
  addDays(weekStart, amount * 7);

/** The seven days of the week, Monday first. */
export const weekDays = (weekStart: string): string[] =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

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

/** "12 Oct – 18 Oct". */
export const weekCaption = (weekStart: string, locale: Locale): string =>
  `${formatIsoDate(weekStart, "d MMM", locale)} – ${formatIsoDate(addDays(weekStart, 6), "d MMM", locale)}`;

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** "Monday". */
export const weekdayName = (isoDate: string, locale: Locale): string =>
  capitalize(formatIsoDate(isoDate, "EEEE", locale));

/** "MON". */
export const weekdayAbbreviation = (isoDate: string, locale: Locale): string =>
  formatIsoDate(isoDate, "EEEE", locale).slice(0, 3).toUpperCase();

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
