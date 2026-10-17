import { tz } from "@date-fns/tz";
import { format, type Locale } from "date-fns";

import { formatIsoDate, toUtcMs, weekdayName } from "@/utils/calendar-dates";

import { SCHOOL_TIME_ZONE, todayInSchoolZone } from "./calendar";

const DAY_MS = 24 * 60 * 60 * 1000;

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
