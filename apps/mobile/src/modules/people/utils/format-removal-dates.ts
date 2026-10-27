import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/locales";

const SCHOOL_TIME_ZONE = "America/Fortaleza";
const DATE_FNS_LOCALES = { "en-US": enUS, "es-ES": es, "pt-BR": ptBR };
const DAY_FIRST_PATTERN = "d MMM";
const MONTH_FIRST_PATTERN = "MMM d";
/** A removed account can be restored for this long (spec 066, D-06). */
const RESTORE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDayAndMonth = (date: Date, locale: AppLocale): string =>
  format(date, locale === "en-US" ? MONTH_FIRST_PATTERN : DAY_FIRST_PATTERN, {
    in: tz(SCHOOL_TIME_ZONE),
    locale: DATE_FNS_LOCALES[locale],
  }).replace(".", "");

/**
 * The day of the removal and the last day to restore it (30 days later), as "2 out" / "1 nov", in the school's time
 * zone; empty texts for an invalid date.
 */
export const formatRemovalDates = (
  removedAt: string,
  locale: AppLocale,
): { date: string; until: string } => {
  const removed = new Date(removedAt);

  if (Number.isNaN(removed.getTime())) {
    return { date: "", until: "" };
  }

  return {
    date: formatDayAndMonth(removed, locale),
    until: formatDayAndMonth(new Date(removed.getTime() + RESTORE_WINDOW_DAYS * DAY_MS), locale),
  };
};
