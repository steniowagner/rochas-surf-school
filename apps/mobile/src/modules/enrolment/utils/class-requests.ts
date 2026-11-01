import type { Locale } from "date-fns";

import { schoolDayOf, schoolTimeOf } from "@/modules/classes/utils/week";
import { formatIsoDate } from "@/utils/calendar-dates";

/** "09:12" and "19 Oct": when a student asked, in the school's time zone. */
export const formatAskedAt = (requestedAt: string, locale: Locale): { time: string; date: string } => ({
  time: schoolTimeOf(requestedAt),
  date: formatIsoDate(schoolDayOf(requestedAt), "d MMM", locale),
});
