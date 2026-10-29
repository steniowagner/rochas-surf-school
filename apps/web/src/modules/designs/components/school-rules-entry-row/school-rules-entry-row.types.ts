import type { Locale } from "@/i18n/locales";
import type { EntryRowGrouping } from "@/modules/designs/utils/entry-row-container.types";

export type SchoolRulesEntryRowProps = {
  locale: Locale;
  /** Picks the subtitle: admins manage the rules, instructors read them. */
  role: "admin" | "instructor";
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  /** How many rules there are; `null` while they load and after an error, when the row has no subtitle. */
  count: number | null;
};
