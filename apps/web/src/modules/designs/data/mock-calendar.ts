import type { Locale } from "@/i18n/locales";

import { appLocaleBySiteLocale } from "../i18n/app-locale";
import { monthWeeks, weekDays } from "./fortaleza";

// The week and month the calendar mocks show, with the weekday and month names in the app's language.
export function buildMockCalendar(locale: Locale) {
  const appLocale = appLocaleBySiteLocale[locale];
  const weekday = (date: string, style: "short" | "narrow") =>
    new Intl.DateTimeFormat(appLocale, { weekday: style, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "").toUpperCase();
  return {
    caption: new Intl.DateTimeFormat(appLocale, { month: "long", timeZone: "UTC" }).format(new Date("2026-09-09T12:00:00Z")),
    week: { days: weekDays.map((day) => ({ ...day, weekday: weekday(day.date, "short") })) },
    month: {
      initials: monthWeeks[1]?.map((day) => weekday(day.date, "narrow")) ?? [],
      weeks: monthWeeks,
      selectedWeekIndex: 1,
    },
  };
}
