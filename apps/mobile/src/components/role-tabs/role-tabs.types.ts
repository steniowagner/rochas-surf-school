import type { TabBarIcons } from "@/components/tab-bar/tab-bar.types";

export type RoleTab = {
  /** The route file of the tab, without the extension (`index` is the first tab). */
  name: string;
  /** The `tabs.*` message key of the label. */
  labelKey: string;
  /** The Ionicons glyph of the tab. */
  icon: TabBarIcons[string];
};

export type RoleTabsProps = {
  tabs: RoleTab[];
};
