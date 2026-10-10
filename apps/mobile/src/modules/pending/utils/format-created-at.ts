import { tz } from "@date-fns/tz";
import { format, formatDistanceStrict } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/locales";

import type { CreatedAtLabel } from "./format-created-at.types";

const SCHOOL_TIME_ZONE = "America/Fortaleza";
const MINUTE_MS = 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;

const DATE_FNS_LOCALES = { "en-US": enUS, "es-ES": es, "pt-BR": ptBR };

/** The "Account created" label (D-04): relative up to a week, then the date in the school's time zone. */
export const formatCreatedAt = (
  createdAt: string,
  now: Date,
  locale: AppLocale,
): CreatedAtLabel | null => {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return null;
  }

  const elapsed = now.getTime() - created.getTime();
  const dateFnsLocale = DATE_FNS_LOCALES[locale];

  // A date in the future (clock skew) reads as "now" too.
  if (elapsed < MINUTE_MS) {
    return { type: "now" };
  }

  if (elapsed < WEEK_MS) {
    return {
      type: "text",
      text: formatDistanceStrict(created, now, {
        addSuffix: true,
        roundingMethod: "floor",
        locale: dateFnsLocale,
      }),
    };
  }

  const inSchoolZone = { in: tz(SCHOOL_TIME_ZONE), locale: dateFnsLocale };
  const isCurrentYear =
    format(created, "yyyy", inSchoolZone) === format(now, "yyyy", inSchoolZone);

  return {
    type: "text",
    text: format(created, isCurrentYear ? "d MMM" : "d MMM yyyy", inSchoolZone),
  };
};
