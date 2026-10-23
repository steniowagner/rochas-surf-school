import type { ClassItem } from "@/modules/classes/classes.types";

import type { MyClassesFilter } from "../enrolment.types";

export type UseMyClassesScreenResult = {
  now: Date;
  filter: MyClassesFilter;
  selectFilter: (filter: MyClassesFilter) => void;
  /** The classes of the selected chip, by start. */
  items: ClassItem[];
  /** Loaded, with nothing under the selected chip (never after an expired session). */
  isEmpty: boolean;
  /** The empty state's line: none at all, or none under the selected chip. */
  emptyKey: "myClasses.empty.all" | "myClasses.empty.filtered";
  isLoading: boolean;
  isError: boolean;
  /** "Try again" is loading the classes: the error stays, with the spinner in its button. */
  isRetrying: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
  openClass: (id: string) => void;
  openHistory: () => void;
};
