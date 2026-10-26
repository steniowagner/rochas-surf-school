import { isValidIsoDate } from "@rochas-surf-school/classes";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";

export const SCHOOL_TIME_ZONE = "America/Fortaleza";

/** Today's date, `YYYY-MM-DD`, in America/Fortaleza whatever the phone's time zone. */
export const todayInSchoolZone = (now: Date = new Date()): string =>
  format(now, "yyyy-MM-dd", { in: tz(SCHOOL_TIME_ZONE) });

/** The minutes after midnight in America/Fortaleza. */
export const minutesInSchoolZone = (now: Date = new Date()): number => {
  const zoned = format(now, "HH:mm", { in: tz(SCHOOL_TIME_ZONE) });

  return Number(zoned.slice(0, 2)) * 60 + Number(zoned.slice(3, 5));
};

export type DateRange = {
  startDate: string | null;
  /** `null` while a single day (or nothing) is chosen. */
  endDate: string | null;
  /** Days of a complete range that are left out: no class is created on them. */
  excludedDates: string[];
};

export const EMPTY_RANGE: DateRange = {
  startDate: null,
  endDate: null,
  excludedDates: [],
};

/**
 * The range Nova aula opens with: the day it was opened for, as a single day, when it is a real date that is today or
 * later; otherwise nothing is picked.
 */
export const initialRange = (date: unknown, today: string): DateRange =>
  isValidIsoDate(date) && date >= today
    ? { startDate: date, endDate: null, excludedDates: [] }
    : EMPTY_RANGE;

/**
 * What tapping a day does: the first tap sets the start, a later day sets the end, an earlier day moves the start.
 * Once the range is complete, a tap on one of its ends removes the range, a tap on a day between them takes the day out
 * of the range (or puts it back), and a tap outside starts over.
 */
export const pressDay = (range: DateRange, day: string): DateRange => {
  const { startDate, endDate, excludedDates } = range;

  if (
    startDate !== null &&
    endDate !== null &&
    (day === startDate || day === endDate)
  ) {
    return EMPTY_RANGE;
  }

  if (
    startDate !== null &&
    endDate !== null &&
    day > startDate &&
    day < endDate
  ) {
    return {
      startDate,
      endDate,
      excludedDates: excludedDates.includes(day)
        ? excludedDates.filter((date) => date !== day)
        : [...excludedDates, day].sort(),
    };
  }

  if (startDate === null || endDate !== null) {
    return { startDate: day, endDate: null, excludedDates: [] };
  }

  if (day > startDate) {
    return { startDate, endDate: day, excludedDates: [] };
  }

  return { startDate: day, endDate: null, excludedDates: [] };
};
