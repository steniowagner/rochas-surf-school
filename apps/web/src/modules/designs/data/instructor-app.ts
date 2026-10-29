// Mock data of the instructor app page: the tab bar and the dates (in the app's language) of its screens.
import type { Locale } from "@/i18n/locales";

import type { TabBarProps } from "../components/tab-bar/tab-bar.types";
import { appLocaleBySiteLocale } from "../i18n/app-locale";
import { appT } from "../i18n/app-t";

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

  return {
    today: "2026-09-07",
    longDay: format("2026-09-07", { weekday: "long", day: "numeric", month: "long" }),
    /** "Terça", "Martes", "Tuesday": the weekday's full name, without the "-feira" of pt-BR (the app's `formatDayName`). */
    dayName: (date: string) => capitalize(format(date, { weekday: "long" }).split("-")[0] ?? ""),
    /** "8 set": the day header's date. */
    shortDate: (date: string) => `${format(date, { day: "numeric" })} ${format(date, { month: "short" }).replace(".", "")}`,
  };
}
