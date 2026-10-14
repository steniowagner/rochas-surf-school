import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getRegistrationErrorKey } from "@/modules/admin/utils/registration-error";
import { useAlertMessage } from "@/providers/alert-message";
import { SessionExpiredError } from "@/services/api";

import { Person } from "../people.types";

import { UsePeopleScreenResult, PeopleRoleFilter } from "./use-people-screen.types";
import { usePeople } from "./use-people.hook";
import { usePeopleCount } from "./use-people-count.hook";

const SEARCH_DEBOUNCE_MS = 300;

export const usePeopleScreen = (): UsePeopleScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<PeopleRoleFilter>("all");
  const [sortByName, setSortByName] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // One request for the final text, not one per key.
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchText.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [searchText]);

  const query = usePeople({
    role: roleFilter === "all" ? undefined : roleFilter,
    search,
    sort: sortByName ? "name" : "recent",
  });
  const countQuery = usePeopleCount();

  const showError = (error: unknown) => {
    const key = getRegistrationErrorKey(error);

    if (key) {
      alertMessage.show(t(key));
    }
  };

  const loadMore = async () => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    const result = await query.fetchNextPage();

    if (result.isFetchNextPageError) {
      showError(result.error);
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([query.refetch(), countQuery.refetch()]);
    setIsRefreshing(false);
  };

  return {
    count: countQuery.data,
    people: query.people,
    searchText,
    setSearchText,
    roleFilter,
    setRoleFilter,
    sortByName,
    toggleSortByName: () => setSortByName((current) => !current),
    isLoading: query.isPending,
    // An expired session is handled once, centrally; a failed next page keeps its rows and only toasts.
    isError:
      query.isError &&
      query.people.length === 0 &&
      !(query.error instanceof SessionExpiredError),
    isEmpty: query.isSuccess && query.people.length === 0,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefreshing,
    retry: () => {
      query.refetch();
    },
    refresh,
    loadMore,
    selectedPerson,
    isSheetVisible,
    openPerson: (person) => {
      setSelectedPerson(person);
      setIsSheetVisible(true);
    },
    closeSheet: () => setIsSheetVisible(false),
  };
};
