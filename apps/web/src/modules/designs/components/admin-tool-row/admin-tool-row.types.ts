import type { EntryRowGrouping } from "@/modules/designs/utils/entry-row-container.types";

import type { AppIconName } from "../app-icon";

export type AdminToolRowProps = {
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  icon: AppIconName;
  title: string;
  subtitle?: string;
  /** How many items wait for the admin; nothing shows when it is zero or unknown. */
  badge?: number;
};
