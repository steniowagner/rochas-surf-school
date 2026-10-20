import type { Locale } from "date-fns";

import { schoolDayOf, schoolTimeOf } from "@/modules/classes/utils/week";
import { formatIsoDate, weekdayAbbreviation } from "@/utils/calendar-dates";

/** "09:12" and "19 Oct": when a student asked, in the school's time zone. */
export const formatAskedAt = (requestedAt: string, locale: Locale): { time: string; date: string } => ({
  time: schoolTimeOf(requestedAt),
  date: formatIsoDate(schoolDayOf(requestedAt), "d MMM", locale),
});

/** The day block of a class card: "MON", "19" and "OCT". */
export const formatDayBlock = (
  startsAt: string,
  locale: Locale,
): { weekday: string; day: string; month: string } => {
  const classDay = schoolDayOf(startsAt);

  return {
    weekday: weekdayAbbreviation(classDay, locale),
    day: formatIsoDate(classDay, "d", locale),
    month: formatIsoDate(classDay, "MMM", locale).replace(".", "").toUpperCase(),
  };
};
