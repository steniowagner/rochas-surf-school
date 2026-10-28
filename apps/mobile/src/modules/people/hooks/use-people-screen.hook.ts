import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getRegistrationErrorKey } from "@/modules/admin/utils/registration-error";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { SessionExpiredError } from "@/services/api";

import { PeopleRole, Person } from "../people.types";
import { usePeopleCount } from "./use-people-count.hook";
import { UsePeopleScreenResult } from "./use-people-screen.types";
import { usePeople } from "./use-people.hook";

const SEARCH_DEBOUNCE_MS = 300;

export const usePeopleScreen = (): UsePeopleScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const { user } = useSession();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<PeopleRole[]>([]);
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

  const query = usePeople({ roles, search });
  const countQuery = usePeopleCount();
  const isApprovedAdmin = user?.role === "admin" && user.status === "approved";

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
    roles,
    toggleRole: (role) =>
      setRoles((current) =>
        current.includes(role)
          ? current.filter((item) => item !== role)
          : [...current, role],
      ),
    isLoading: query.isPending,
    // An expired session is handled once, centrally; a failed next page keeps its rows and only toasts.
    isError:
      query.isError &&
      query.people.length === 0 &&
      !(query.error instanceof SessionExpiredError),
    isEmpty: query.isSuccess && query.people.length === 0,
    isFetchingNextPage: query.isFetchingNextPage,
    isRefreshing,
    isRetrying: query.isFetching,
    retry: () => {
      query.refetch();
    },
    refresh,
    loadMore,
    selectedPerson,
    // Only an approved admin changes roles, and never their own (spec 058, D-04).
    canChangeRole:
      isApprovedAdmin &&
      selectedPerson !== null &&
      selectedPerson.id !== user.id,
    isSheetVisible,
    openPerson: (person) => {
      setSelectedPerson(person);
      setIsSheetVisible(true);
    },
    closeSheet: () => setIsSheetVisible(false),
  };
};
