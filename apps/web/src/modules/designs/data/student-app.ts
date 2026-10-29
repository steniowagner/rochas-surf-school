// Mock data of the student app page: the tab bar, the dates (in the app's language) and the classes of the screens.
import type { Locale } from "@/i18n/locales";

import type { ClassCardProps } from "../components/class-card/class-card.types";
import type { TabBarProps } from "../components/tab-bar/tab-bar.types";
import { appLocaleBySiteLocale } from "../i18n/app-locale";
import { appT } from "../i18n/app-t";
import { students } from "./fortaleza";

export const studentTabs = (locale: Locale): TabBarProps["tabs"] => [
  { key: "agenda", label: appT(locale, "tabs.agenda"), icon: "Ionicons:calendar-outline" },
  { key: "myClasses", label: appT(locale, "tabs.myClasses"), icon: "Ionicons:ticket-outline" },
  { key: "school", label: appT(locale, "tabs.school"), icon: "Feather:users" },
  { key: "profile", label: appT(locale, "tabs.profile"), icon: "FontAwesome6:circle-user" },
];

/** The mock days: today is Monday 7 September 2026 and the class of the details is on the 9th. */
export function studentDates(locale: Locale) {
  const appLocale = appLocaleBySiteLocale[locale];
  const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(appLocale, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const weekdayShort = (date: string) => format(date, { weekday: "long" }).slice(0, 3);
  const dayMonth = (date: string) => `${format(date, { day: "numeric" })} ${format(date, { month: "short" }).replace(".", "")}`;
  const deadline = (date: string, time: string) => `${weekdayShort(date)}, ${dayMonth(date)} · ${time}`;
  const monthShort = (date: string) => format(date, { month: "short" }).replace(".", "").toUpperCase();

  return {
    weekCaption: `${format("2026-09-07", { day: "numeric" })} – ${format("2026-09-13", { day: "numeric" })} ${monthShort("2026-09-13")}`,
    monthCaption: format("2026-09-09", { month: "long", year: "numeric" }).toUpperCase(),
    longDay: format("2026-09-09", { weekday: "long", day: "numeric", month: "long" }),
    dateLine: `${capitalize(format("2026-09-09", { weekday: "long" }))} · ${dayMonth("2026-09-09")}`,
    weekdayLabel: format("2026-09-09", { weekday: "long" }).slice(0, 3).toUpperCase(),
    dayLabel: dayMonth("2026-09-09"),
    shortDayLabel: `${weekdayShort("2026-09-09")}, ${dayMonth("2026-09-09")}`,
    deadlineAhead: deadline("2026-09-08", "20:00"),
    deadlinePassed: deadline("2026-09-07", "08:00"),
    classStart: `${weekdayShort("2026-09-09")}, ${dayMonth("2026-09-09")} · 08:00`,
    historyDay: `${capitalize(format("2026-09-02", { weekday: "long" }))} · ${dayMonth("2026-09-02")}`,
    historyCaption: format("2026-09-09", { month: "long", year: "numeric" }).toUpperCase(),
    dayLine: (date: string) => `${capitalize(format(date, { weekday: "long" }))} · ${dayMonth(date)}`,
    shortDay: (date: string) => dayMonth(date),
    since: (date: string) => format(date, { month: "short", year: "numeric" }).replace(".", ""),
  };
}

type CardBase = Omit<ClassCardProps, "locale">;

const iracema: CardBase = {
  discipline: "surf",
  level: "beginner",
  state: "notStarted",
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
  seatsTaken: 4,
  capacity: 8,
  students: students.slice(0, 4).map((student) => ({ ...student })),
};

const futuro: CardBase = { ...iracema, discipline: "skate", level: "advanced", timeRange: "16:00 – 17:30", locationName: "Praia do Futuro", seatsTaken: 8 };

/** The day's classes of the agenda, as the student sees them: each with the student's own enrolment. */
export const agendaClasses: CardBase[] = [
  { ...iracema, state: "started", timeRange: "06:30 – 08:00", seatsTaken: 6 },
  { ...iracema, enrolment: "approved" },
  { ...iracema, timeRange: "10:00 – 11:30", locationName: "Praia do Futuro", level: "advanced", enrolment: "pending" },
  { ...iracema, timeRange: "14:00 – 15:30", seatsTaken: 3, students: students.slice(1, 4).map((student) => ({ ...student })) },
  futuro,
];

/** The student's classes of "Minhas aulas", by status; `ended` also lists a finished class. */
export const myClasses: { key: string; filters: ("pending" | "confirmed" | "ended")[]; card: CardBase }[] = [
  { key: "pending", filters: ["pending"], card: { ...iracema, timeRange: "10:00 – 11:30", enrolment: "pending" } },
  { key: "waiting", filters: ["pending"], card: { ...futuro, enrolment: "waitingList" } },
  { key: "approved", filters: ["confirmed"], card: { ...iracema, enrolment: "approved" } },
  { key: "approvedSkate", filters: ["confirmed"], card: { ...futuro, seatsTaken: 5, enrolment: "approved" } },
  { key: "denied", filters: ["ended"], card: { ...iracema, timeRange: "07:00 – 08:30", enrolment: "denied" } },
  { key: "withdrawn", filters: ["ended"], card: { ...futuro, seatsTaken: 3, enrolment: "withdrawn" } },
  { key: "expired", filters: ["ended"], card: { ...iracema, timeRange: "09:00 – 10:30", enrolment: "expired" } },
  { key: "cancelled", filters: ["ended"], card: { ...futuro, seatsTaken: 4, enrolment: "cancelled" } },
  { key: "takenOut", filters: ["ended"], card: { ...iracema, timeRange: "11:00 – 12:30", enrolment: "takenOut" } },
  { key: "finished", filters: ["ended"], card: { ...iracema, state: "finished", seatsTaken: 5 } },
];

const marked = [2, 7, 9, 11, 16, 18, 23, 30];

const monthDay = (date: string, number: number, adjacent = false) => ({
  date,
  number,
  selected: date === "2026-09-09",
  today: date === "2026-09-07",
  marked: !adjacent && marked.includes(number),
  adjacent,
});

/** September 2026 as the month grid draws it: five weeks, the days of the other months faded. */
export const septemberWeeks = [
  [monthDay("2026-08-31", 31, true), ...[1, 2, 3, 4, 5, 6].map((n) => monthDay(`2026-09-0${n}`, n))],
  [7, 8, 9, 10, 11, 12, 13].map((n) => monthDay(`2026-09-${String(n).padStart(2, "0")}`, n)),
  [14, 15, 16, 17, 18, 19, 20].map((n) => monthDay(`2026-09-${n}`, n)),
  [21, 22, 23, 24, 25, 26, 27].map((n) => monthDay(`2026-09-${n}`, n)),
  [...[28, 29, 30].map((n) => monthDay(`2026-09-${n}`, n)), ...[1, 2, 3, 4].map((n) => monthDay(`2026-10-0${n}`, n, true))],
];

export type DirectoryPerson = { name: string; role: "student" | "instructor" | "admin"; since: string };

/** The people of the school the directory lists, by name. */
export const directory: DirectoryPerson[] = [
  { name: "Ana Beatriz Lima", role: "student", since: "2026-03-10" },
  { name: "Bruno Costa", role: "admin", since: "2025-11-02" },
  { name: "Caio Sousa", role: "student", since: "2026-05-18" },
  { name: "Carla Mendes", role: "instructor", since: "2025-12-01" },
  { name: "Daniela Reis", role: "student", since: "2026-06-22" },
  { name: "Elisa Alves", role: "student", since: "2026-07-05" },
  { name: "Marcos Lima", role: "instructor", since: "2026-01-14" },
  { name: "Marina Teixeira", role: "instructor", since: "2026-02-09" },
  { name: "Rafael Rocha", role: "instructor", since: "2025-10-20" },
];

/** September 2026 as the history's month grid draws it: the days the student took a class are marked, none is selected. */
export const historyWeeks = (selected: number | null) =>
  septemberWeeks.map((week) =>
    week.map((day) => ({
      ...day,
      selected: day.date === `2026-09-0${selected}`,
      marked: !day.adjacent && [1, 3, 5].includes(day.number),
    })),
  );
