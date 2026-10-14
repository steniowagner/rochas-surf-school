import { PeopleRole, PeopleSort, Person } from "../people.types";

export type PeopleRoleFilter = "all" | PeopleRole;

export type UsePeopleScreenResult = {
  count: number | undefined;
  people: Person[];
  searchText: string;
  setSearchText: (text: string) => void;
  roleFilter: PeopleRoleFilter;
  setRoleFilter: (role: PeopleRoleFilter) => void;
  sort: PeopleSort;
  setSort: (sort: PeopleSort) => void;
  isFilterVisible: boolean;
  openFilter: () => void;
  closeFilter: () => void;
  isLoading: boolean;
  isError: boolean;
  /** Loaded fine and nobody matches. */
  isEmpty: boolean;
  isFetchingNextPage: boolean;
  isRefreshing: boolean;
  retry: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectedPerson: Person | null;
  isSheetVisible: boolean;
  openPerson: (person: Person) => void;
  closeSheet: () => void;
};
