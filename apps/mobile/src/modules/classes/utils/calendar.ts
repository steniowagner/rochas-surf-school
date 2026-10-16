import { tz } from "@date-fns/tz";
import { format, type Locale } from "date-fns";
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

const FULL_GRID_WEEKS = 6;

/**
 * The weeks of a month, Monday first. The cells after the last day are the first days of the next month, so a week
 * that crosses the month can be picked. The cells before the 1st are `null`, unless `full` is set: then they are the
 * last days of the previous month and the grid always has six weeks, a full 7x7 matrix with the weekday row.
 */
export const buildMonthGrid = (
  month: CalendarMonth,
  full = false,
): (string | null)[][] => {
  const first = toIsoDate(month, 1);
  const leading = isoWeekdayOf(first) - 1;
  const length = new Date(month.year, month.month, 0).getDate();
  const previous = addMonths(month, -1);
  const previousLength = new Date(previous.year, previous.month, 0).getDate();
  const next = addMonths(month, 1);
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, (_, index) =>
      full ? toIsoDate(previous, previousLength - leading + index + 1) : null,
    ),
    ...Array.from({ length }, (_, index) => toIsoDate(month, index + 1)),
  ];
  const total = full
    ? FULL_GRID_WEEKS * 7
    : Math.ceil(cells.length / 7) * 7;

  for (let day = 1; cells.length < total; day += 1) {
    cells.push(toIsoDate(next, day));
  }

  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
};

export type DateRange = {
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
  /** Days of a complete range that are left out: no class is created on them. */
  excludedDates: string[];
};

export const EMPTY_RANGE: DateRange = { startDate: null, endDate: null, excludedDates: [] };

/**
 * What tapping a day does: the first tap sets the start, a later day sets the end, an earlier day moves the start.
 * Once the range is complete, a tap on one of its ends removes the range, a tap on a day between them takes the day out
 * of the range (or puts it back), and a tap outside starts over.
 */
export const pressDay = (range: DateRange, day: string): DateRange => {
  const { startDate, endDate, excludedDates } = range;

  if (startDate !== null && endDate !== null && (day === startDate || day === endDate)) {
    return EMPTY_RANGE;
  }

  if (startDate !== null && endDate !== null && day > startDate && day < endDate) {
    return {
      startDate,
      endDate,
      excludedDates: excludedDates.includes(day)
        ? excludedDates.filter((date) => date !== day)
        : [...excludedDates, day].sort(),
    };
  }

  if (startDate === null || endDate !== null) {
    return { startDate: day, endDate: null, excludedDates: [] };
  }

  if (day > startDate) {
    return { startDate, endDate: day, excludedDates: [] };
  }

  return { startDate: day, endDate: null, excludedDates: [] };
};

export const formatIsoDate = (isoDate: string, pattern: string, locale: Locale): string =>
  format(toLocalDate(isoDate), pattern, { locale });
