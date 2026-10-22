import type { GreetingPeriod } from "./greeting-period.types";

const MORNING_STARTS_AT = 5;
const AFTERNOON_STARTS_AT = 12;
const EVENING_STARTS_AT = 18;

/** The part of the day on the phone's clock: morning from 5:00, afternoon from 12:00 and evening from 18:00 until 4:59. */
export const getGreetingPeriod = (date: Date): GreetingPeriod => {
  const hour = date.getHours();

  if (hour >= MORNING_STARTS_AT && hour < AFTERNOON_STARTS_AT) {
    return "morning";
  }

  if (hour >= AFTERNOON_STARTS_AT && hour < EVENING_STARTS_AT) {
    return "afternoon";
  }

  return "evening";
};
