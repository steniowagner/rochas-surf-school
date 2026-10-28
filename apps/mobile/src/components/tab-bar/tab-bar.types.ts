import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { TabBarIcon } from "@/components/tab-bar-item/tab-bar-item.types";

export type TabBarIcons = Record<string, TabBarIcon>;

export type TabBarProps = BottomTabBarProps & {
  /** The glyph of each tab, by route name. */
  icons: TabBarIcons;
  /** The label of each tab, by route name. */
  labels: Record<string, string>;
};
