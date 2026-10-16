import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { WeekClasses } from "../classes.types";

/** The classes of the week that starts on the Monday `weekStart` (`YYYY-MM-DD`). */
export const useWeekClasses = (weekStart: string) =>
  useQuery({
    queryKey: ["classes", "week", weekStart],
    queryFn: () =>
      apiGet<WeekClasses>(`/classes?date=${weekStart}`, { authenticated: true }),
  });
