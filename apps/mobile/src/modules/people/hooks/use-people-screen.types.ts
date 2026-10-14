import { PeopleRole, Person } from "../people.types";

export type UsePeopleScreenResult = {
  count: number | undefined;
  people: Person[];
  searchText: string;
  setSearchText: (text: string) => void;
  role: PeopleRole;
  setRole: (role: PeopleRole) => void;
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
