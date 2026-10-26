import type { EntryRowGrouping } from "@/utils/entry-row-container.types";

export type SchoolRulesEntryRowRole = "admin" | "instructor";

export type SchoolRulesEntryRowProps = {
  /** Picks the subtitle: admins manage the rules, instructors read them. */
  role: SchoolRulesEntryRowRole;
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  onPress: () => void;
};

export type UseSchoolRulesEntryRowProps = Pick<
  SchoolRulesEntryRowProps,
  "role"
>;
