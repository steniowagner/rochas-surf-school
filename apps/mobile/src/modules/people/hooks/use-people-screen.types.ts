import { PeopleRole, Person } from "../people.types";

export type UsePeopleScreenResult = {
  count: number | undefined;
  people: Person[];
  searchText: string;
  setSearchText: (text: string) => void;
  roles: PeopleRole[];
  /** Selects the role, or unselects it when it was selected. */
  toggleRole: (role: PeopleRole) => void;
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
