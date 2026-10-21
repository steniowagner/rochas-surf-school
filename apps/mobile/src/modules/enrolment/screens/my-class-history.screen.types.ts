import type { ClassItem } from "@/modules/classes/classes.types";

export type UseMyClassHistoryScreenResult = {
  now: Date;
  /** The classes taken, newest first, every page loaded so far. */
  classes: ClassItem[];
  isLoading: boolean;
  isError: boolean;
  /** Loaded, with no class taken yet. */
  isEmpty: boolean;
  isFetchingNextPage: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
  loadMore: () => Promise<void>;
  openClass: (id: string) => void;
};
