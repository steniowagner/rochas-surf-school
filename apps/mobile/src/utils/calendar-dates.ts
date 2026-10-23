import { format, type Locale } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/locales";

import type { CalendarMonth } from "./calendar-dates.types";

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_FNS_LOCALES = { "en-US": enUS, "es-ES": es, "pt-BR": ptBR };

export const getDateLocale = (locale: string) =>
  DATE_FNS_LOCALES[locale as AppLocale] ?? enUS;

/** A date at local midnight, for formatting only: the same year, month and day as the string, in any zone. */
export const toLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];

  return new Date(year, month - 1, day);
};

/** The UTC instant of a `YYYY-MM-DD` date's midnight, for counting days. */
export const toUtcMs = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];

  return Date.UTC(year, month - 1, day);
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

export const formatIsoDate = (isoDate: string, pattern: string, locale: Locale): string =>
  format(toLocalDate(isoDate), pattern, { locale });

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

/** "OCT": upper-cased, without the trailing dot some locales put on the abbreviation. */
const monthAbbreviation = (isoDate: string, locale: Locale): string =>
  formatIsoDate(isoDate, "MMM", locale).replace(/\.$/, "").toUpperCase();

/** "18 OCT". */
const dayAndMonth = (isoDate: string, locale: Locale): string =>
  `${formatIsoDate(isoDate, "d", locale)} ${monthAbbreviation(isoDate, locale)}`;

/** "12 – 18 OCT" for a week inside one month, "28 SEP – 4 OCT" when it spans two (the year is never shown). */
export const weekCaption = (weekStart: string, locale: Locale): string => {
  const weekEnd = addDays(weekStart, 6);
  const start =
    weekStart.slice(0, 7) === weekEnd.slice(0, 7)
      ? formatIsoDate(weekStart, "d", locale)
      : dayAndMonth(weekStart, locale);

  return `${start} – ${dayAndMonth(weekEnd, locale)}`;
};

/** "OCTOBER 2026". */
export const monthCaption = (month: CalendarMonth, locale: Locale): string =>
  formatIsoDate(toIsoDate(month, 1), "MMMM yyyy", locale).toUpperCase();

/**
 * A `YYYY-MM-DD` date moved by whole months, keeping the day number, or the last day of the target month when it
 * has fewer days (31 Jan + 1 month = 28 Feb).
 */
export const addMonthsKeepingDay = (isoDate: string, amount: number): string => {
  const target = addMonths(monthOf(isoDate), amount);
  const lastDay = new Date(target.year, target.month, 0).getDate();

  return toIsoDate(target, Math.min(Number(isoDate.slice(8, 10)), lastDay));
};

/** The initials of the weekdays, Monday first, upper-cased: "M T W T F S S". */
export const weekdayInitials = (locale: Locale): string[] =>
  weekDays("2026-10-12").map((day) => formatIsoDate(day, "EEEEE", locale).toUpperCase());

/**
 * The weeks of a month, Monday first, with only the weeks it needs (4 to 6): the days before the 1st are the last
 * days of the previous month, and the days after the last are the first days of the next one.
 */
export const buildFittedMonthGrid = (month: CalendarMonth): string[][] => {
  const leading = isoWeekdayOf(toIsoDate(month, 1)) - 1;
  const length = new Date(month.year, month.month, 0).getDate();

  return (buildMonthGrid(month, true) as string[][]).slice(0, Math.ceil((leading + length) / 7));
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** "Monday". */
export const weekdayName = (isoDate: string, locale: Locale): string =>
  capitalize(formatIsoDate(isoDate, "EEEE", locale));

// The weekday, day and month without the year, in each app locale's own order (date-fns has no such long format).
const LONG_DAY_PATTERNS: Record<string, string> = {
  "en-US": "EEEE, MMMM d",
  es: "EEEE, d 'de' MMMM",
  "pt-BR": "EEEE, d 'de' MMMM",
};

/** "Saturday, October 17", "sábado, 17 de outubro". */
export const formatLongDay = (isoDate: string, locale: Locale): string =>
  formatIsoDate(isoDate, LONG_DAY_PATTERNS[locale.code] ?? LONG_DAY_PATTERNS["en-US"], locale);

/** "MON". */
export const weekdayAbbreviation = (isoDate: string, locale: Locale): string =>
  formatIsoDate(isoDate, "EEEE", locale).slice(0, 3).toUpperCase();

/** The accessibility label of a day: its full date, then `, <markedLabel>` when the day is marked and a label is given. */
export const dayAccessibilityLabel = (
  isoDate: string,
  locale: Locale,
  markedLabel: string | undefined,
): string => {
  const date = formatIsoDate(isoDate, "PPPP", locale);

  return markedLabel === undefined ? date : `${date}, ${markedLabel}`;
};

/** The first and the last day drawn by the fitted grid of a month (`buildFittedMonthGrid`). */
export const monthRange = (month: CalendarMonth): { from: string; to: string } => {
  const first = toIsoDate(month, 1);
  const leading = isoWeekdayOf(first) - 1;
  const length = new Date(month.year, month.month, 0).getDate();
  const from = addDays(first, -leading);

  return { from, to: addDays(from, Math.ceil((leading + length) / 7) * 7 - 1) };
};

/** The most dots a calendar day shows. */
export const MAX_DAY_DOTS = 3;

/** How many dots a calendar day shows: none when it isn't marked, else its count (one when it has none), up to 3. */
export const markedDayDots = (
  isoDate: string,
  markedDates: ReadonlySet<string>,
  markedCounts: Record<string, number> | undefined,
): number =>
  markedDates.has(isoDate) ? Math.min(MAX_DAY_DOTS, markedCounts?.[isoDate] || 1) : 0;
