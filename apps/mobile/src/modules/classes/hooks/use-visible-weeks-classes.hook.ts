import { useQueries } from "@tanstack/react-query";

import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import { addWeeks, mondayOf } from "@/utils/calendar-dates";

import { weekClassesOptions } from "./use-week-classes.hook";

const mondaysBetween = ({ from, to }: VisibleRange): string[] => {
  const mondays: string[] = [];

  for (let monday = mondayOf(from); monday <= to; monday = addWeeks(monday, 1)) {
    mondays.push(monday);
  }

  return mondays;
};

/**
 * The classes of every week a calendar draws, one query per Monday under the same key and request as
 * `useWeekClasses`, so a week that is already loaded is not requested again. A week that failed contributes nothing.
 */
export const useVisibleWeeksClasses = (range: VisibleRange) =>
  useQueries({
    queries: mondaysBetween(range).map(weekClassesOptions),
    combine: (results) => ({
      items: results.flatMap((result) => result.data?.items ?? []),
      refetch: () => Promise.all(results.map((result) => result.refetch())),
    }),
  });
