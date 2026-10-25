import { useTranslation } from "react-i18next";

import { getDateLocale } from "@/utils/calendar-dates";

import {
  buildOccupancyDays,
  buildOccupancyRows,
} from "../../utils/weekly-occupancy";
import { OccupancyMapProps } from "./occupancy-map.types";

export const useOccupancyMap = ({
  weekStart,
  today,
  classes,
}: Pick<OccupancyMapProps, "weekStart" | "today" | "classes">) => {
  const { i18n } = useTranslation();

  return {
    days: buildOccupancyDays(weekStart, today, getDateLocale(i18n.language)),
    rows: buildOccupancyRows(weekStart, classes),
  };
};
