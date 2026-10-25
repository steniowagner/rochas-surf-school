import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { routes } from "@/constants/routes";
import type {
  ClassItem,
  DisciplineFilterValue,
} from "@/modules/classes/classes.types";
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
  const [discipline, setDiscipline] = useState<DisciplineFilterValue>("all");
  // Only the user's pull-to-refresh turns the spinner on, not the refetch of a focus.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useMyClasses();
  const { refetch } = query;

  // Back on the tab, the requests may have changed elsewhere (the Agenda, a push): read them again, without
  // restarting a load already running. Leaving the tab puts the chips and the sport back on "Todos".
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });

      return () => {
        setFilter("all");
        setDiscipline("all");
      };
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

  // With no classes loaded, a fetch after an error goes back to pending: while "Try again" runs, the error stays on
  // screen with the spinner in its button, instead of the loading state.
  const isRetrying = query.isPending && query.errorUpdateCount > 0;
  const items = filterMyClasses(query.data?.items ?? NO_ITEMS, filter).filter(
    (item) => discipline === "all" || item.discipline === discipline,
  );

  return {
    now,
    filter,
    selectFilter: setFilter,
    discipline,
    selectDiscipline: setDiscipline,
    items,
    isEmpty: query.data !== undefined && items.length === 0,
    emptyKey:
      `myClasses.empty.${filter === "all" ? "all" : "filtered"}${discipline === "all" ? "" : "Sport"}` as const,
    isLoading: query.isPending && !isRetrying,
    // An expired session is handled by the session flow; a failed refetch keeps the list it had.
    isError:
      isRetrying ||
      (query.isError &&
        query.data === undefined &&
        !(query.error instanceof SessionExpiredError)),
    isRetrying,
    isRefreshing,
    refresh,
    retry: () => void refetch(),
    openClass: (id) => router.push(routes.student.classDetail(id)),
    openHistory: () => router.push(routes.student.myHistory),
  };
};
