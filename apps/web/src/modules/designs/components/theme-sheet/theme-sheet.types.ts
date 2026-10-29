import type { AppIconName } from "../app-icon";

export type ThemeSheetProps = {
  title: string;
  description: string;
  options: { icon: AppIconName; label: string; selected: boolean }[];
};
