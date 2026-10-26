import type { EntryRowGrouping } from "@/utils/entry-row-container.types";

export type TeachingClassesEntryRowRole = "admin" | "instructor";

export type TeachingClassesEntryRowProps = {
  /** Instructors always see the row; admins only once they teach a class. */
  role: TeachingClassesEntryRowRole;
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  onPress: () => void;
};

export type UseTeachingClassesEntryRowProps = Pick<
  TeachingClassesEntryRowProps,
  "role"
>;

export type UseTeachingClassesEntryRowResult = {
  visible: boolean;
  /** How many classes are assigned, or `null` while loading and after an error. */
  subtitle: string | null;
};
