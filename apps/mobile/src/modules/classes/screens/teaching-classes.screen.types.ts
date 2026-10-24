import type { ClassItem } from "../classes.types";

export type TeachingClassesScreenProps = {
  /** Picks the class details' route. */
  role: "instructor" | "admin";
};

export type UseTeachingClassesScreenProps = TeachingClassesScreenProps;

/** One row of the list: a class under way, a day's header, or a class of that day. */
export type TeachingClassesRow =
  | { type: "ongoing"; key: string; item: ClassItem }
  | { type: "day"; key: string; label: string; date: string }
  | { type: "class"; key: string; item: ClassItem; isNext: boolean };

export type UseTeachingClassesScreenResult = {
  now: Date;
  rows: TeachingClassesRow[];
  /** Loaded, with no class left to show (never after an expired session). */
  isEmpty: boolean;
  isLoading: boolean;
  isError: boolean;
  /** "Try again" is loading the classes: the error stays, with the spinner in its button. */
  isRetrying: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
  openClass: (id: string) => void;
};
