import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/locales";

import { CalendarMonth } from "../classes.types";

export const SCHOOL_TIME_ZONE = "America/Fortaleza";

const DATE_FNS_LOCALES = { "en-US": enUS, "es-ES": es, "pt-BR": ptBR };

export const getDateLocale = (locale: string) =>
  DATE_FNS_LOCALES[locale as AppLocale] ?? enUS;

/** Today's date, `YYYY-MM-DD`, in America/Fortaleza whatever the phone's time zone. */
export const todayInSchoolZone = (now: Date = new Date()): string =>
  format(now, "yyyy-MM-dd", { in: tz(SCHOOL_TIME_ZONE) });

/** The minutes after midnight in America/Fortaleza. */
export const minutesInSchoolZone = (now: Date = new Date()): number => {
  const zoned = format(now, "HH:mm", { in: tz(SCHOOL_TIME_ZONE) });

  return Number(zoned.slice(0, 2)) * 60 + Number(zoned.slice(3, 5));
};

/** A date at local midnight, for formatting only: the same year, month and day as the string, in any zone. */
export const toLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];

  return new Date(year, month - 1, day);
};

export const toIsoDate = (month: CalendarMonth, day: number): string =>
  `${month.year}-${String(month.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const monthOf = (isoDate: string): CalendarMonth => ({
  year: Number(isoDate.slice(0, 4)),
  month: Number(isoDate.slice(5, 7)),
});

export const addMonths = (month: CalendarMonth, amount: number): CalendarMonth => {
  const index = month.year * 12 + (month.month - 1) + amount;

  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const isSameMonth = (a: CalendarMonth, b: CalendarMonth): boolean =>
  a.year === b.year && a.month === b.month;

/** ISO weekday of a `YYYY-MM-DD` date: 1 (Monday) to 7 (Sunday). */
export const isoWeekdayOf = (isoDate: string): number => {
  const day = toLocalDate(isoDate).getDay();

  return day === 0 ? 7 : day;
};

/** The weeks of a month, Monday first; days outside the month are `null`. */
export const buildMonthGrid = (month: CalendarMonth): (string | null)[][] => {
  const first = toIsoDate(month, 1);
  const leading = isoWeekdayOf(first) - 1;
  const length = new Date(month.year, month.month, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length }, (_, index) => toIsoDate(month, index + 1)),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
};

export type DateRange = {
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
};

/**
 * What tapping a day does: the first tap sets the start, a later day sets the end, an earlier day moves the start,
 * and a tap after a complete range starts over.
 */
export const pressDay = (range: DateRange, day: string): DateRange => {
  if (range.startDate === null || range.endDate !== null) {
    return { startDate: day, endDate: null };
  }

  if (day > range.startDate) {
    return { startDate: range.startDate, endDate: day };
  }

  return { startDate: day, endDate: null };
};
