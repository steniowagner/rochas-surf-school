import { useTranslation } from "react-i18next";

import { schoolDayOf, schoolTimeOf } from "@/modules/classes/utils/week";
import { formatIsoDate, getDateLocale, weekdayName } from "@/utils/calendar-dates";

import type { UseRequestSeatClassCardProps } from "./request-seat-class-card.types";

const MINUTE_MS = 60 * 1000;

export const useRequestSeatClassCard = ({ startsAt, endsAt }: UseRequestSeatClassCardProps) => {
  const { t, i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const classDay = schoolDayOf(startsAt);
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / MINUTE_MS);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return {
    // "Quarta", not "Quarta-feira": the label is short.
    weekday: weekdayName(classDay, locale).split("-")[0],
    date: formatIsoDate(classDay, "d MMM", locale).replace(".", "").toUpperCase(),
    duration:
      hours === 0
        ? t("enrolment.requestSheet.durationMinutes", { count: rest })
        : rest === 0
          ? t("enrolment.requestSheet.durationHours", { count: hours })
          : t("enrolment.requestSheet.durationHoursMinutes", { hours, minutes: rest }),
    timeRange: `${schoolTimeOf(startsAt)} – ${schoolTimeOf(endsAt)}`,
  };
};
