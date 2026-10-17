import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { WeekClasses } from "../classes.types";

/** The query of the week that starts on the Monday `weekStart` (`YYYY-MM-DD`), shared by everything that reads weeks. */
export const weekClassesOptions = (weekStart: string) =>
  queryOptions({
    queryKey: ["classes", "week", weekStart],
    queryFn: () =>
      apiGet<WeekClasses>(`/classes?date=${weekStart}`, { authenticated: true }),
  });

/** The classes of the week that starts on the Monday `weekStart` (`YYYY-MM-DD`). */
export const useWeekClasses = (weekStart: string) =>
  useQuery(weekClassesOptions(weekStart));
