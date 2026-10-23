import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { MyClassHistoryPeriod, MyClassHistoryResponse } from "../enrolment.types";

/** The key of one period of the history; under `["classes"]`, so every class change refreshes it. */
export const myClassHistoryQueryKey = ({ from, to }: MyClassHistoryPeriod) =>
  ["classes", "mine", "history", from, to] as const;

/** The classes the student took in the period, newest first, unpaged; each period is cached on its own. */
export const useMyClassHistory = (period: MyClassHistoryPeriod) =>
  useQuery({
    queryKey: myClassHistoryQueryKey(period),
    queryFn: () =>
      apiGet<MyClassHistoryResponse>(
        `/classes/mine/history?from=${period.from}&to=${period.to}`,
        { authenticated: true },
      ),
    retry: false,
  });
