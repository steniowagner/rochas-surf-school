import { PeopleRole, Person, RemovedAccount } from "../people.types";

export type UsePeopleScreenResult = {
  count: number | undefined;
  people: Person[];
  /** The "Contas removidas" rows: empty unless the viewer is an approved admin looking at the full directory. */
  removedAccounts: RemovedAccount[];
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
  /** True while the retry of a failed load runs. */
  isRetrying: boolean;
  retry: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectedPerson: Person | null;
  /** The viewer may change the selected person's role. */
  canChangeRole: boolean;
  isSheetVisible: boolean;
  openPerson: (person: Person) => void;
  closeSheet: () => void;
};
