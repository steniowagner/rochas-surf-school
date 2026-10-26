import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { EntryRowGrouping } from "@/utils/entry-row-container.types";

export type AdminToolRowProps = {
  /** Set when the row shares a card with others: no card of its own. */
  grouped?: EntryRowGrouping;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle?: string;
  /** How many items wait for the admin; nothing shows when it is zero or unknown. */
  badge?: number;
  onPress: () => void;
};
