import { addDays, format } from "date-fns";
import { useTranslation } from "react-i18next";

import { getDateLocale } from "../../utils/calendar";

import { UseWeekdayFilterProps } from "./weekday-filter.types";

// date-fns' abbreviated weekday is the whole name in Portuguese ("segunda"), so there the short form is used ("seg").
const WEEKDAY_FORMATS: Record<string, string> = { "pt-BR": "EEEEEE" };

// A Monday; any week would do.
const REFERENCE_MONDAY = new Date(2026, 9, 12);

export const useWeekdayFilter = ({ weekdays, onChange }: UseWeekdayFilterProps) => {
  const { i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);

  const options = Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    label: format(addDays(REFERENCE_MONDAY, index), WEEKDAY_FORMATS[locale.code] ?? "EEE", { locale }),
  }));

  const toggle = (weekday: number) => {
    onChange(
      weekdays.includes(weekday)
        ? weekdays.filter((item) => item !== weekday)
        : [...weekdays, weekday].sort((a, b) => a - b),
    );
  };

  return { options, toggle };
};
