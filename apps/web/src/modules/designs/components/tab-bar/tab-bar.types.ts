import type { AppIconName } from "../app-icon";

export type TabBarProps = {
  tabs: { key: string; label: string; icon: AppIconName }[];
  selected: string;
};
