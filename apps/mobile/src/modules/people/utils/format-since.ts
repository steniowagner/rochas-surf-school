import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/locales";

const SCHOOL_TIME_ZONE = "America/Fortaleza";
const DATE_FNS_LOCALES = { "en-US": enUS, "es-ES": es, "pt-BR": ptBR };

/** The month and year a person joined ("jul 2026"), in the school's time zone; `""` for an invalid date. */
export const formatSince = (createdAt: string, locale: AppLocale): string => {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return "";
  }

  return format(created, "MMM yyyy", {
    in: tz(SCHOOL_TIME_ZONE),
    locale: DATE_FNS_LOCALES[locale],
  });
};
