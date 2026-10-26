import type { EntryRowGrouping } from "@/utils/entry-row-container.types";

export type PeopleEntryRowProps = {
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  onPress: () => void;
};
