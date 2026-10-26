import type { EntryRowGrouping } from "./entry-row-container.types";

/** The classes of an entry row's container: a card of its own, or a slot of the card the rows share. */
export const entryRowContainerClassName = (grouped?: EntryRowGrouping) => {
  if (!grouped) {
    return "rounded-card border border-line bg-surface px-4";
  }

  return grouped === "next" ? "border-t border-line px-4" : "px-4";
};
