import { ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { isValidIsoDate, toInstant } from "../model";

/** The longest period, in days counting both ends: the largest month grid. */
export const MY_CLASS_HISTORY_MAX_DAYS = 42;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The `YYYY-MM-DD` day after a real `YYYY-MM-DD` date. */
function nextDay(date: string): string {
  return new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * Checks the raw `from` / `to` query strings of a history and answers the period as instants: 00:00
 * America/Fortaleza on `from`, up to (not including) 00:00 on the day after `to`.
 */
export function toHistoryPeriod(from: unknown, to: unknown): { from: Date; to: Date } {
  const errors: ValidationError[] = [];

  if (!isValidIsoDate(from)) errors.push(new ValidationError("class.from.invalid"));
  if (!isValidIsoDate(to)) errors.push(new ValidationError("class.to.invalid"));
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) throw new ValidationException(errors);

  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;

  if (days < 1 || days > MY_CLASS_HISTORY_MAX_DAYS) {
    throw new ValidationException([new ValidationError("class.range.invalid")]);
  }

  return { from: toInstant(from, 0), to: toInstant(nextDay(to), 0) };
}
