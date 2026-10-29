// Mock data of the admin app page (spec 075 D-04): the tab bar, the dates (in the app's language) and the admin's lists.
import type { Locale } from "@/i18n/locales";

import type { CalendarDayProps } from "../components/calendar-day/calendar-day.types";
import type { CalendarWeekDay } from "../components/calendar-week-row/calendar-week-row.types";
import type { TabBarProps } from "../components/tab-bar/tab-bar.types";
import type { TimeRangeChip } from "../components/time-range-picker/time-range-picker.types";
import { appLocaleBySiteLocale } from "../i18n/app-locale";
import { adminAccount } from "./fortaleza";
import { instructorTabs } from "./instructor-app";
import { directory, type DirectoryPerson } from "./student-app";

/** The admin's tab bar: Início, Aulas, Pessoas and Perfil, the instructor's tabs (the app's admin `RoleTabs`). */
export const adminTabs = (locale: Locale): TabBarProps["tabs"] => instructorTabs(locale);

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The admin's mock days: today is Monday 7 September 2026, as on the other pages. */
export function adminDates(locale: Locale) {
  const appLocale = appLocaleBySiteLocale[locale];
  const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(appLocale, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const monthShort = (date: string) => format(date, { month: "short" }).replace(".", "").toUpperCase();
  const weekday = (date: string) => format(date, { weekday: "short" }).replace(".", "").toUpperCase();

  return {
    today: "2026-09-07",
    /** "terça-feira, 8 de setembro": the day in the empty and error states. */
    longDay: (date: string) => format(date, { weekday: "long", day: "numeric", month: "long" }),
    /** "Quarta, 9 Set": the class of a message (the app's `formatClassDate`). */
    classDate: (date: string) => {
      const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
      const weekdayName = format(date, { weekday: "long" }).split("-")[0] ?? "";

      return `${capitalize(weekdayName)}, ${format(date, { day: "numeric" })} ${capitalize(format(date, { month: "short" }).replace(".", ""))}`;
    },
    /** "14 set": a day of the class form's range (the app's "d MMM"). */
    shortDay: (date: string) => `${format(date, { day: "numeric" })} ${format(date, { month: "short" }).replace(".", "")}`,
    /** The class requests group's day block: "QUA", "9", "SET" and "2026" (the app's `formatDayBlock`). */
    dayBlock: (date: string) => ({ weekday: weekday(date), day: format(date, { day: "numeric" }), month: monthShort(date), year: format(date, { year: "numeric" }) }),
    /** "12 de ago. de 2026": the day a deleted account was deleted (the app's `formatReactivationDate`). */
    longDate: (date: string) => format(date, { day: "numeric", month: "short", year: "numeric" }),
    /** "2 set" / "Sep 2": a removed account's dates, the month first in English (the app's `formatRemovalDates`). */
    removalDay: (date: string) => {
      const day = format(date, { day: "numeric" });
      const month = format(date, { month: "short" }).replace(".", "");

      return locale === "en" ? `${month} ${day}` : `${day} ${month}`;
    },
    /** The day a removed account is deleted for good: 30 days after it was removed. */
    deletedOn: (removedAt: string) => addDays(removedAt, 30),
    /** The week before today's, 31 Aug – 6 Sep, with Friday 4 selected: a past day. */
    pastWeek: {
      caption: `${format("2026-08-31", { day: "numeric" })} ${monthShort("2026-08-31")} – ${format("2026-09-06", { day: "numeric" })} ${monthShort("2026-09-06")}`,
      days: Array.from({ length: 7 }, (_, index) => addDays("2026-08-31", index)).map(
        (date): CalendarWeekDay => ({ date, weekday: weekday(date), number: Number(date.slice(8)), selected: date === "2026-09-04", today: false, marked: date === "2026-09-02" }),
      ),
    },
  };
}

const adminPerson: DirectoryPerson = { name: adminAccount.name, role: "admin", since: "2025-09-15" };

/** The school's directory as the admin's People tab lists it: the student page's, with the signed-in admin among them. */
export const adminDirectory: DirectoryPerson[] = [...directory, adminPerson].sort((a, b) => a.name.localeCompare(b.name));

/** What the class form's calendar holds: a range with its removed days, or a single day (the edit form's). */
export type RangeSelection = { start: string | null; end: string | null; excluded: string[] };

/**
 * September 2026 as the class form's calendar draws it (the app's `useDateRangeCalendar`): Monday first, the days before
 * the 1st left blank, the first days of October to end the last week; the days before today can't be picked, and the
 * range's band runs from its first to its last day, each week's stretch a pill of its own.
 */
export function rangeCalendar(locale: Locale, { start, end, excluded }: RangeSelection) {
  const appLocale = appLocaleBySiteLocale[locale];
  const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(appLocale, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const today = "2026-09-07";
  const month = `${format("2026-09-01", { month: "long" })} ${format("2026-09-01", { year: "numeric" })}`;
  const hasBand = start !== null && end !== null && start !== end;
  const day = (date: string, weekday: number): CalendarDayProps => {
    const inRange = hasBand && date >= start && date <= end;

    return {
      date,
      disabled: date < today,
      adjacentMonth: !date.startsWith("2026-09"),
      today: date === today,
      edge: date === start || date === end,
      inRange,
      bandStart: inRange && (date === start || weekday === 0),
      bandEnd: inRange && (date === end || weekday === 6),
      excluded: inRange && excluded.includes(date),
    };
  };
  // 1 September 2026 is a Tuesday: one blank day, then the 30 days, then 1 to 4 October.
  const cells: (string | null)[] = [null, ...Array.from({ length: 30 }, (_, index) => addDays("2026-09-01", index)), ...Array.from({ length: 4 }, (_, index) => addDays("2026-10-01", index))];
  const weeks = Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7).map((date, weekday) => (date === null ? null : day(date, weekday))));

  return {
    monthLabel: month.charAt(0).toUpperCase() + month.slice(1),
    initials: Array.from({ length: 7 }, (_, index) => format(addDays("2026-09-07", index), { weekday: "narrow" }).toUpperCase()),
    weeks,
    canGoPrevious: false,
  };
}

/** The time ranges of last week's classes, the class form's suggestions. */
const SUGGESTED_RANGES = ["06:30 – 08:00", "08:00 – 09:30", "09:00 – 10:30", "16:00 – 17:30", "17:30 – 19:00"];

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const overlaps = (a: string, b: string) => minutes(a.slice(0, 5)) < minutes(b.slice(8)) && minutes(b.slice(0, 5)) < minutes(a.slice(8));

/**
 * The class form's time chips (the app's `useTimeRangePicker`): the suggestions, the selected ones, and the ones that
 * overlap a selected range blocked; in `single` mode (the edit form) only one is chosen and nothing overlaps.
 */
export function timeChips(selected: string[], single = false): TimeRangeChip[] {
  return SUGGESTED_RANGES.map((label) => {
    const isSelected = selected.includes(label);

    return { label, selected: isSelected, blocked: !isSelected && !single && selected.some((range) => overlaps(range, label)) };
  });
}
