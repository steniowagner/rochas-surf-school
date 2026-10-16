import { useTranslation } from "react-i18next";

import { formatIsoDate, getDateLocale } from "../../utils/calendar";

import { UseDateRangeSummaryProps } from "./date-range-summary.types";

const SHORT_DATE = "d MMM";

export const useDateRangeSummary = ({
  startDate,
  endDate,
  excludedDates,
}: UseDateRangeSummaryProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);

  const formatDay = (date: string) => formatIsoDate(date, SHORT_DATE, locale);

  return {
    from: startDate === null ? null : formatDay(startDate),
    to: endDate === null ? null : formatDay(endDate),
    excluded: excludedDates.map((date) => ({
      date,
      label: formatDay(date),
    })),
  };
};
