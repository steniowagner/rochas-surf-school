import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { ClassHistoryPeriod, TeachingClassHistoryResponse } from "../classes.types";

/** The key of one period of the teaching history; under `["classes"]`, so every class change refreshes it. */
export const teachingClassHistoryQueryKey = ({ from, to }: ClassHistoryPeriod) =>
  ["classes", "teaching", "history", from, to] as const;

/** The classes the instructor or admin taught in the period, newest first, unpaged; each period is cached on its own. */
export const useTeachingClassHistory = (period: ClassHistoryPeriod) =>
  useQuery({
    queryKey: teachingClassHistoryQueryKey(period),
    queryFn: () =>
      apiGet<TeachingClassHistoryResponse>(
        `/classes/teaching/history?from=${period.from}&to=${period.to}`,
        { authenticated: true },
      ),
    retry: false,
  });
