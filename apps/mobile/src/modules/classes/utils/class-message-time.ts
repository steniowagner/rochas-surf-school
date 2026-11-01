import type { Locale } from "date-fns";

import { addDays, formatIsoDate, weekdayAbbreviation } from "@/utils/calendar-dates";

import { todayInSchoolZone } from "./calendar";
import { schoolDayOf, schoolTimeOf } from "./week";

const RECENT_DAYS = 6;

/** A message's time on the class details (D-14): "10:24" today, "Qui" for the 6 days before, then "12 out". */
export const classMessageTime = (createdAt: string, now: Date, locale: Locale): string => {
  const today = todayInSchoolZone(now);
  const day = schoolDayOf(createdAt);

  if (day === today) {
    return schoolTimeOf(createdAt);
  }

  if (day < today && day >= addDays(today, -RECENT_DAYS)) {
    const weekday = weekdayAbbreviation(day, locale);

    return weekday.charAt(0) + weekday.slice(1).toLowerCase();
  }

  return formatIsoDate(day, "d MMM", locale).replace(".", "");
};
