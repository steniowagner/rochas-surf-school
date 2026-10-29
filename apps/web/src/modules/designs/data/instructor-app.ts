// Mock data of the instructor app page: the tab bar and the dates (in the app's language) of its screens.
import type { Locale } from "@/i18n/locales";

import type { OccupancyMapDay, OccupancyMapRow } from "../components/occupancy-map/occupancy-map.types";
import type { TabBarProps } from "../components/tab-bar/tab-bar.types";
import { appLocaleBySiteLocale } from "../i18n/app-locale";
import { appT } from "../i18n/app-t";
import { occupancyClasses } from "./fortaleza";

export const instructorTabs = (locale: Locale): TabBarProps["tabs"] => [
  { key: "home", label: appT(locale, "tabs.home"), icon: "Feather:home" },
  { key: "classes", label: appT(locale, "tabs.classes"), icon: "Ionicons:calendar-outline" },
  { key: "people", label: appT(locale, "tabs.people"), icon: "Feather:users" },
  { key: "profile", label: appT(locale, "tabs.profile"), icon: "FontAwesome6:circle-user" },
];

/** The instructor's mock days: today is Monday 7 September 2026, the day the "Aulas" tab opens on. */
export function instructorDates(locale: Locale) {
  const appLocale = appLocaleBySiteLocale[locale];
  const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(appLocale, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  const weekday = (date: string) => format(date, { weekday: "short" }).replace(".", "").toUpperCase();
  const dayAndMonth = (date: string) => `${format(date, { day: "numeric" })} ${format(date, { month: "short" }).replace(".", "").toUpperCase()}`;

  return {
    today: "2026-09-07",
    /** "SEG": the occupancy map's weekday. */
    weekday,
    /** "7 – 13 SET": the week bar's caption (the app's `weekCaption`). */
    weekCaption: (weekStart: string) => `${format(weekStart, { day: "numeric" })} – ${dayAndMonth(addDays(weekStart, 6))}`,
    /** "SETEMBRO 2026": the week picker's month (the app's `monthCaption`). */
    monthCaption: `${format("2026-09-07", { month: "long" })} ${format("2026-09-07", { year: "numeric" })}`.toUpperCase(),
    longDay: format("2026-09-07", { weekday: "long", day: "numeric", month: "long" }),
    /** "Terça", "Martes", "Tuesday": the weekday's full name, without the "-feira" of pt-BR (the app's `formatDayName`). */
    dayName: (date: string) => capitalize(format(date, { weekday: "long" }).split("-")[0] ?? ""),
    /** "8 set": the day header's date. */
    shortDate: (date: string) => `${format(date, { day: "numeric" })} ${format(date, { month: "short" }).replace(".", "")}`,
  };
}

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The occupancy classes of the week starting on `weekStart`, with their dates. */
const weekClasses = (weekStart: string) => occupancyClasses.map((item) => ({ ...item, date: addDays(weekStart, item.day), cancelled: item.cancelled ?? false }));

/**
 * The weekly occupancy of the week starting on `weekStart` (a Monday), as the app lays it out: the days, a row per start
 * time (more on a day with several classes at that time), the stats over the classes that weren't cancelled, and the
 * class selected when the week opens (the emptiest one that wasn't cancelled).
 */
export function occupancyWeek(locale: Locale, weekStart: string) {
  const dates = instructorDates(locale);
  const classes = weekClasses(weekStart);
  const days: OccupancyMapDay[] = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((date) => ({
    date,
    weekday: dates.weekday(date),
    dayNumber: String(Number(date.slice(8))),
    isToday: date === dates.today,
  }));
  const times = [...new Set(classes.map((item) => item.time))].sort();
  const rows: OccupancyMapRow[] = times.flatMap((time) => {
    const byDay = days.map((day) => classes.filter((item) => item.time === time && item.date === day.date));
    const subRows = Math.max(...byDay.map((items) => items.length));

    return Array.from({ length: subRows }, (_, index) => ({
      time,
      showsTime: index === 0,
      slots: byDay.map((items, dayIndex) => {
        const item = items[index];

        return item ? { kind: "class" as const, item } : { kind: "empty" as const, date: days[dayIndex]?.date ?? "" };
      }),
    }));
  });
  const active = classes.filter((item) => !item.cancelled);
  const taken = active.reduce((sum, item) => sum + Math.min(item.seatsTaken, item.capacity), 0);
  const total = active.reduce((sum, item) => sum + item.capacity, 0);
  const emptiest = active.reduce((best, item) => (item.seatsTaken / item.capacity < best.seatsTaken / best.capacity ? item : best));

  return {
    days,
    rows,
    classes,
    stats: { percent: Math.round((taken / total) * 100), taken, total, free: total - taken, fullClasses: active.filter((item) => item.seatsTaken >= item.capacity).length },
    defaultSelectedId: emptiest.id,
  };
}
