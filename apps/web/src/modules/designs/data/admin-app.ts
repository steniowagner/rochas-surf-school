// Mock data of the admin app page (spec 075 D-04): the tab bar, the dates (in the app's language) and the admin's lists.
import type { Locale } from "@/i18n/locales";

import type { CalendarWeekDay } from "../components/calendar-week-row/calendar-week-row.types";
import type { TabBarProps } from "../components/tab-bar/tab-bar.types";
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
