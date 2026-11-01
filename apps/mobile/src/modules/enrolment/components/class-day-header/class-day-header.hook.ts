import { useTranslation } from "react-i18next";

import { schoolTimeOf } from "@/modules/classes/utils/week";
import { getDateLocale } from "@/utils/calendar-dates";

import { formatDayBlock } from "../../utils/class-requests";

import type { UseClassDayHeaderProps } from "./class-day-header.types";

export const useClassDayHeader = ({
  startsAt,
  endsAt,
  showYear,
}: UseClassDayHeaderProps) => {
  const { i18n } = useTranslation();
  const block = formatDayBlock(startsAt, getDateLocale(i18n.language));

  return {
    weekday: block.weekday,
    day: block.day,
    month: showYear ? `${block.month} ${block.year}` : block.month,
    timeRange: `${schoolTimeOf(startsAt)} – ${schoolTimeOf(endsAt)}`,
  };
};
