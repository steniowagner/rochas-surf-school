import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { routes } from "@/constants/routes";
import type { ClassItem } from "@/modules/classes/classes.types";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { SessionExpiredError } from "@/services/api";

import type { MyClassesFilter } from "../enrolment.types";
import { useMyClasses } from "../hooks/use-my-classes.hook";
import { filterMyClasses } from "../utils/my-classes-filter";

import type { UseMyClassesScreenResult } from "./my-classes.screen.types";

const NO_ITEMS: ClassItem[] = [];

export const useMyClassesScreen = (): UseMyClassesScreenResult => {
  const now = useNow();
  const [filter, setFilter] = useState<MyClassesFilter>("all");
  // Only the user's pull-to-refresh turns the spinner on, not the refetch of a focus.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useMyClasses();
  const { refetch } = query;

  // Back on the tab, the requests may have changed elsewhere (the Agenda, a push): read them again, without
  // restarting a load already running. Leaving the tab puts the chips back on "Todos".
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });

      return () => setFilter("all");
    }, [refetch]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const items = filterMyClasses(query.data?.items ?? NO_ITEMS, filter);

  return {
    now,
    filter,
    selectFilter: setFilter,
    items,
    isEmpty: query.data !== undefined && items.length === 0,
    emptyKey: filter === "all" ? "myClasses.empty.all" : "myClasses.empty.filtered",
    isLoading: query.isPending,
    // An expired session is handled by the session flow; a failed refetch keeps the list it had.
    isError:
      query.isError && query.data === undefined && !(query.error instanceof SessionExpiredError),
    isRefreshing,
    refresh,
    retry: () => void refetch(),
    openClass: (id) => router.push(routes.student.classDetail(id)),
    openHistory: () => router.push(routes.student.myHistory),
  };
};
