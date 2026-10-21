import { useInfiniteQuery } from "@tanstack/react-query";

import type { ClassItem } from "@/modules/classes/classes.types";
import { apiGet } from "@/services/api";

import { MyClassHistoryPage } from "../enrolment.types";

export const MY_CLASS_HISTORY_PAGE_SIZE = 20;

/** The classes the student took, newest first, 20 per page; a class repeated across pages is dropped. */
export const useMyClassHistory = () => {
  const query = useInfiniteQuery({
    queryKey: ["classes", "mine", "history"],
    queryFn: ({ pageParam }) =>
      apiGet<MyClassHistoryPage>(
        `/classes/mine/history?page=${pageParam}&perPage=${MY_CLASS_HISTORY_PAGE_SIZE}`,
        { authenticated: true },
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * MY_CLASS_HISTORY_PAGE_SIZE < last.total ? last.page + 1 : undefined,
    retry: false,
  });

  const seen = new Set<string>();
  const classes: ClassItem[] = [];

  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        classes.push(item);
      }
    }
  }

  return { ...query, classes };
};
