import type { Locale } from "@/i18n/locales";
import type { EntryRowGrouping } from "@/modules/designs/utils/entry-row-container.types";

export type WeeklyOccupancyEntryRowProps = {
  locale: Locale;
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
};
